import { DurableObject } from "cloudflare:workers";
import { handleRequest } from "./index.js";

// Keep the deployed class resolvable until its namespace is retired separately.
export class AfricanTranslator extends DurableObject {
  async fetch() {
    return new Response("The former translator is unavailable.", { status: 503 });
  }
}

export default { fetch: handleRequest };
