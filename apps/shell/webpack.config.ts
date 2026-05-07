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
    port: 3000,
    host: "127.0.0.1",
    historyApiFallback: true,
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
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        recordsRemote: "recordsRemote@http://127.0.0.1:3001/remoteEntry.js",
        toolsRemote: "toolsRemote@http://127.0.0.1:3002/remoteEntry.js",
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
