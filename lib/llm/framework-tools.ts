import { invoke } from '@tauri-apps/api/core'
import type { LLMTool } from './types'
import { useLLMSettings } from './store'

export const FRAMEWORK_TOOLS: LLMTool[] = [
{name:'framework_snapshot',description:'Return a structured overview of the Ubermench framework, plugins, pages, domains, engines and available local data.',input_schema:{type:'object',properties:{}}},
{name:'framework_search',description:'Search the complete framework source tree for a term. Use this before guessing where functionality lives.',input_schema:{type:'object',properties:{query:{type:'string'},limit:{type:'integer',minimum:1,maximum:100}},required:['query']}},
{name:'framework_read_file',description:'Read a UTF-8 file from the framework repository.',input_schema:{type:'object',properties:{path:{type:'string'},maxBytes:{type:'integer',minimum:1,maximum:200000}},required:['path']}},
{name:'framework_write_file',description:'Create or replace a framework file. Only allowed when framework write access is enabled in Settings.',input_schema:{type:'object',properties:{path:{type:'string'},content:{type:'string'}},required:['path','content']}},
{name:'framework_run_command',description:'Run a safe project command such as npm test/build. Only explicitly allowlisted commands are accepted.',input_schema:{type:'object',properties:{command:{type:'string'},args:{type:'array',items:{type:'string'}}},required:['command']}},
{name:'mcp_list_tools',description:'List tools exposed by enabled MCP servers.',input_schema:{type:'object',properties:{}}},
{name:'mcp_call_tool',description:'Call a tool exposed by an enabled MCP server.',input_schema:{type:'object',properties:{serverId:{type:'string'},toolName:{type:'string'},arguments:{type:'object'}},required:['serverId','toolName']}}
]

async function mcpRequest(server:any, method:string, params:any) {
  if (server.transport !== 'http' || !server.url) throw new Error(`MCP server ${server.id} is not an HTTP server with a URL. Stdio MCP requires the desktop bridge implementation.`)
  const r = await fetch(server.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method,params})})
  if(!r.ok) throw new Error(`MCP ${server.id} HTTP ${r.status}: ${(await r.text()).slice(0,500)}`)
  return r.json()
}

export async function executeFrameworkTool(name:string,args:Record<string,unknown>,allowWrite:boolean){
  if(name==='framework_write_file'&&!allowWrite) throw new Error('Framework write access is disabled in Settings.')
  switch(name){
    case 'framework_snapshot': return invoke('framework_snapshot')
    case 'framework_search': return invoke('framework_search',{query:String(args.query??''),limit:Number(args.limit??40)})
    case 'framework_read_file': return invoke('framework_read_file',{path:String(args.path??''),maxBytes:Number(args.maxBytes??100000)})
    case 'framework_write_file': return invoke('framework_write_file',{path:String(args.path??''),content:String(args.content??'')})
    case 'framework_run_command': return invoke('framework_run_command',{command:String(args.command??''),args:Array.isArray(args.args)?args.args.map(String):[]})
    case 'mcp_list_tools': { const {settings}=useLLMSettings(); const out:any[]=[]; for(const server of settings.value.mcpServers.filter(s=>s.enabled)){ try{out.push({serverId:server.id,result:await mcpRequest(server,'tools/list',{})})}catch(error){out.push({serverId:server.id,error:String(error)})} } return out }
    case 'mcp_call_tool': { const {settings}=useLLMSettings(); const serverId=String(args.serverId??''); const server=settings.value.mcpServers.find(s=>s.id===serverId); if(!server) throw new Error(`Unknown MCP server: ${serverId}`); return mcpRequest(server,'tools/call',{name:String(args.toolName??''),arguments:(args.arguments as Record<string,unknown>)??{}}) }
    default: throw new Error(`Unknown framework tool: ${name}`)
  }
}
