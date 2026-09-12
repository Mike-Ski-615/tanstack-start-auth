export default {
  project: ["src/**/*.{ts,tsx}", "src/styles/*.css"],

  entry: ["src/routes/**/*.tsx", "src/prisma/contract.ts"],

  ignore: ["src/components/ui/**"],

  ignoreDependencies: ["cookie-es"],

  ignoreExportsUsedInFile: true,

  rules: {
    exports: "warn",
    types: "warn",
  },
};
