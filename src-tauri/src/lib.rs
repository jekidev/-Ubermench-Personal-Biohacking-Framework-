use keyring::Entry;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)] pub struct SourceFingerprint { pub sha256: String, pub size_bytes: usize }
#[derive(Debug, Serialize)] pub struct FileHit { pub path: String, pub preview: String }
fn entry(provider: &str) -> Result<Entry, String> { Entry::new("ubermench", &format!("llm:{provider}")).map_err(|e| e.to_string()) }
#[tauri::command] fn llm_set_secret(provider:String,value:String)->Result<(),String>{entry(&provider)?.set_password(&value).map_err(|e|e.to_string())}
#[tauri::command] fn llm_get_secret(provider:String)->Result<String,String>{entry(&provider)?.get_password().map_err(|e|e.to_string())}
#[tauri::command] fn llm_has_secret(provider:String)->bool{entry(&provider).and_then(|e|e.get_password().map_err(|e|e.to_string())).is_ok()}
fn root()->PathBuf{PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")}
fn safe_path(rel:&str)->Result<PathBuf,String>{let p=Path::new(rel);if p.is_absolute()||p.components().any(|c|matches!(c,std::path::Component::ParentDir)){return Err("unsafe path".into())}Ok(root().join(p))}
#[tauri::command] fn framework_snapshot()->Result<serde_json::Value,String>{let r=root();let mut f=Vec::new();fn walk(r:&Path,c:&Path,o:&mut Vec<String>){if let Ok(es)=fs::read_dir(c){for e in es.flatten(){let p=e.path();let rel=p.strip_prefix(r).unwrap_or(&p).to_string_lossy().replace('\\',"/");if rel.starts_with(".git/")||rel.starts_with("node_modules/")||rel.starts_with(".nuxt/")||rel.starts_with(".output/"){continue}if p.is_dir(){walk(r,&p,o)}else{o.push(rel)}}}}walk(&r,&r,&mut f);f.sort();Ok(serde_json::json!({"fileCount":f.len(),"files":f,"modules":["longevity","fearprime","AI model registry","LLM agent","MCP"]}))}
#[tauri::command] fn framework_search(query:String,limit:usize)->Result<Vec<FileHit>,String>{let r=root();let q=query.to_lowercase();let mut hits=Vec::new();fn walk(r:&Path,c:&Path,q:&str,l:usize,h:&mut Vec<FileHit>){if h.len()>=l{return}if let Ok(es)=fs::read_dir(c){for e in es.flatten(){if h.len()>=l{return}let p=e.path();let rel=p.strip_prefix(r).unwrap_or(&p).to_string_lossy().replace('\\',"/");if rel.starts_with(".git/")||rel.starts_with("node_modules/")||rel.starts_with(".nuxt/")||rel.starts_with(".output/"){continue}if p.is_dir(){walk(r,&p,q,l,h);continue}if let Ok(t)=fs::read_to_string(&p){let low=t.to_lowercase();if let Some(i)=low.find(q){let s=i.saturating_sub(160);let e=(i+q.len()+300).min(t.len());h.push(FileHit{path:rel,preview:t[s..e].replace('\n'," ")})}}}}}walk(&r,&r,&q,limit.min(100),&mut hits);Ok(hits)}
#[tauri::command] fn framework_read_file(path:String,max_bytes:usize)->Result<String,String>{let b=fs::read(safe_path(&path)?).map_err(|e|e.to_string())?;Ok(String::from_utf8_lossy(&b[..b.len().min(max_bytes)]).to_string())}
#[tauri::command] fn framework_write_file(path:String,content:String)->Result<(),String>{let p=safe_path(&path)?;if let Some(d)=p.parent(){fs::create_dir_all(d).map_err(|e|e.to_string())?}fs::write(p,content).map_err(|e|e.to_string())}
#[tauri::command] fn framework_run_command(command:String,args:Vec<String>)->Result<String,String>{if !["npm","pnpm","cargo"].contains(&command.as_str()){return Err("command not allowlisted".into())}let o=std::process::Command::new(command).args(args).current_dir(root()).output().map_err(|e|e.to_string())?;let mut s=String::from_utf8_lossy(&o.stdout).to_string();s.push_str(&String::from_utf8_lossy(&o.stderr));s.truncate(s.len().min(120000));Ok(s)}
#[tauri::command] fn fingerprint_bytes(data:Vec<u8>)->SourceFingerprint{let mut h=Sha256::new();h.update(&data);SourceFingerprint{sha256:format!("{:x}",h.finalize()),size_bytes:data.len()}}
#[tauri::command] fn app_name()->&'static str{"Ubermench"}
#[cfg_attr(mobile,tauri::mobile_entry_point)] pub fn run(){tauri::Builder::default().plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_fs::init()).invoke_handler(tauri::generate_handler![fingerprint_bytes,app_name,llm_set_secret,llm_get_secret,llm_has_secret,framework_snapshot,framework_search,framework_read_file,framework_write_file,framework_run_command]).run(tauri::generate_context!()).expect("error while running Ubermench application");}
