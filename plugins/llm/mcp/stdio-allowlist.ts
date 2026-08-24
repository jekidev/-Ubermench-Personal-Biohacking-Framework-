export type StdioServerDefinition = {
  serverId: string
  executable: string
  allowedArgs?: readonly string[]
}

export function validateStdioCommand(
  server: StdioServerDefinition,
  command: string,
  args: readonly string[] = [],
): void {
  if (command !== server.executable) {
    throw new Error('MCP stdio executable is not allowlisted.')
  }

  if (server.allowedArgs && !args.every((arg) => server.allowedArgs!.includes(arg))) {
    throw new Error('MCP stdio argument is not allowlisted.')
  }
}
