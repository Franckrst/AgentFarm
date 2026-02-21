const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

export function info(message: string): void {
  console.log(`${COLORS.blue}agentfarm:${COLORS.reset} ${message}`);
}

export function success(message: string): void {
  console.log(`${COLORS.green}agentfarm:${COLORS.reset} ${message}`);
}

export function warn(message: string): void {
  console.log(`${COLORS.yellow}agentfarm:${COLORS.reset} ${message}`);
}

export function error(message: string): void {
  console.error(`${COLORS.red}agentfarm:${COLORS.reset} ${message}`);
}

export function debug(message: string): void {
  if (process.env.AGENTFARM_DEBUG === '1') {
    console.log(`${COLORS.gray}agentfarm [debug]:${COLORS.reset} ${message}`);
  }
}

export function advance(message: string): void {
  console.log(`${COLORS.blue}advance:${COLORS.reset} ${message}`);
}
