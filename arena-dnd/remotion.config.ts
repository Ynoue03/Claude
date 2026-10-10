import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("png"); // pixel art: sem compressão JPEG nos quadros
Config.setOverwriteOutput(true);

// Sem internet para baixar o Chrome do Remotion? Aponte para um Chromium local:
//   CHROME=/caminho/do/headless_shell npx remotion render ...
if (process.env.CHROME) Config.setBrowserExecutable(process.env.CHROME);
