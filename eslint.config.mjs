import nextVitals from "eslint-config-next/core-web-vitals";
import { globalIgnores } from "eslint/config";

const config = [globalIgnores(["coverage/**"]), ...nextVitals];

export default config;
