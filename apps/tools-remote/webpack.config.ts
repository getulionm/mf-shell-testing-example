import path from "path";
import { fileURLToPath } from "url";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";

const { container } = webpack;
const { ModuleFederationPlugin } = container;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "development",
  entry: path.resolve(__dirname, "src/index.ts"),
  output: {
    publicPath: "auto",
    clean: true,
  },
  devServer: {
    port: 3002,
    host: "127.0.0.1",
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    static: {
      directory: path.resolve(__dirname, "dist"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/i,
        exclude: /node_modules/,
        use: [{ loader: "ts-loader", options: { transpileOnly: true } }],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "toolsRemote",
      filename: "remoteEntry.js",
      exposes: {
        "./mount": path.resolve(__dirname, "src/mount.ts"),
      },
      shared: {
        "@mf/module-contracts": { singleton: true, eager: true },
        "@mf/fault-toggles": { singleton: true, eager: true },
      },
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "src/index.html"),
    }),
  ],
  resolve: {
    extensions: [".ts", ".js"],
  },
};
