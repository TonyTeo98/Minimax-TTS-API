export interface Config {
  host: string;
  port: number;
}

const config: Config = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '8000', 10)
};

export default config;
