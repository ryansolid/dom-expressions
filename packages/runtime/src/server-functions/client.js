// Client half of the server function runtime ABI. Compiled client output
// calls `createServerReference(id)` where a server function was referenced;
// the function body never reaches this bundle. Hoisted from SolidStart's
// fns/client.ts with neutral header names and a configurable endpoint.
import {
  BODY_FORMAT_HEADER,
  BodyFormat,
  FUNCTION_HEADER,
  INSTANCE_HEADER,
  configureServerFunctionsCodec,
  decodeResponse,
  getHeadersAndBody,
  getServerFunctionsCodec,
  serializeString
} from "./shared.js";

export { FUNCTION_HEADER, INSTANCE_HEADER, decodeResponse } from "./shared.js";

const config = {
  endpoint: "/_server"
};

/**
 * Configures the transport before any server function is called: the
 * endpoint the server handler is mounted on and the codec options (extra
 * plugins etc. — must match the server's; stored in the shared layer so
 * `decodeResponse` sees them too).
 */
export function configureServerFunctionsClient({ endpoint, codec } = {}) {
  if (endpoint !== undefined) config.endpoint = endpoint;
  if (codec !== undefined) configureServerFunctionsCodec(codec);
}

let INSTANCE = 0;

function createRequest(base, id, instance, options) {
  return fetch(base, {
    method: "POST",
    ...options,
    headers: {
      ...options.headers,
      [FUNCTION_HEADER]: id,
      [INSTANCE_HEADER]: instance
    }
  });
}

async function initializeResponse(base, id, instance, options, args) {
  // No args, skip serialization
  if (args.length === 0) {
    return createRequest(base, id, instance, options);
  }
  // A single argument with a natural HTTP encoding goes as-is
  if (args.length === 1) {
    const result = getHeadersAndBody(args[0]);
    if (result) {
      return createRequest(base, id, instance, {
        ...options,
        body: result.body,
        headers: {
          ...options.headers,
          ...result.headers
        }
      });
    }
  }
  // Everything else goes through the codec
  return createRequest(base, id, instance, {
    ...options,
    body: await serializeString(args, getServerFunctionsCodec()),
    headers: {
      ...options.headers,
      "Content-Type": "text/plain",
      [BODY_FORMAT_HEADER]: BodyFormat.Serialized
    }
  });
}

async function fetchServerFunction(base, id, options, args) {
  const instance = `server-function:${INSTANCE++}`;

  const response = await initializeResponse(base, id, instance, options, args);

  // Responses the caller's integration needs to see whole (redirects,
  // revalidation, single-flight payloads) pass through untouched — the
  // integration decodes the body itself with `decodeResponse`.
  if (
    response.headers.has("Location") ||
    response.headers.has("X-Revalidate") ||
    response.headers.has("X-Single-Flight")
  ) {
    return response;
  }

  const result = await decodeResponse(response.clone());
  if (response.headers.has("X-Server-Function-Error")) {
    throw result;
  }
  return result;
}

/**
 * Produces the client-side callable for a server function id. The returned
 * proxy also exposes `url` (for forms), `GET` (encode args in the query
 * string), and `withOptions` (custom RequestInit).
 */
export function createServerReference(id) {
  const fn = (...args) => fetchServerFunction(config.endpoint, id, {}, args);

  return new Proxy(fn, {
    get(target, prop, receiver) {
      if (prop === "url") {
        return `${config.endpoint}?id=${encodeURIComponent(id)}`;
      }
      if (prop === "GET") {
        return receiver.withOptions({ method: "GET" });
      }
      if (prop === "withOptions") {
        const url = `${config.endpoint}?id=${encodeURIComponent(id)}`;
        return options => {
          const wrapped = async (...args) => {
            const encodeArgs = options.method && options.method.toUpperCase() === "GET";
            return fetchServerFunction(
              encodeArgs
                ? url +
                    (args.length
                      ? `&args=${encodeURIComponent(
                          await serializeString(args, getServerFunctionsCodec())
                        )}`
                      : "")
                : config.endpoint,
              id,
              options,
              encodeArgs ? [] : args
            );
          };
          wrapped.url = url;
          return wrapped;
        };
      }
      return target[prop];
    }
  });
}

// Only ever referenced by server-mode compiler output; present so a
// misconfigured build fails loudly instead of with a missing-export error.
export function registerServerReference() {
  throw new Error("registerServerReference must not be called in the client build");
}
