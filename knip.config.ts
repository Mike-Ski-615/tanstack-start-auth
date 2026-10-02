export default {
  project: ["src/**/*.{ts,tsx}", "src/styles/*.css"],

  entry: ["src/routes/**/*.tsx"],

  ignore: ["src/components/ui/**"],

  ignoreDependencies: ["@better-auth/prisma-adapter"],

  ignoreExportsUsedInFile: true,

  rules: {
    exports: "warn",
    types: "warn",
  },
};
