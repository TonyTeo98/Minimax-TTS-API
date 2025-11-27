import 'colors';

const logger = {
  info: (...args: any[]) => {
    console.log(`[${new Date().toISOString()}]`.gray, '[INFO]'.cyan, ...args);
  },

  success: (...args: any[]) => {
    console.log(`[${new Date().toISOString()}]`.gray, '[SUCCESS]'.green, ...args);
  },

  warn: (...args: any[]) => {
    console.log(`[${new Date().toISOString()}]`.gray, '[WARN]'.yellow, ...args);
  },

  error: (...args: any[]) => {
    console.log(`[${new Date().toISOString()}]`.gray, '[ERROR]'.red, ...args);
  },

  debug: (...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[${new Date().toISOString()}]`.gray, '[DEBUG]'.magenta, ...args);
    }
  }
};

export default logger;
