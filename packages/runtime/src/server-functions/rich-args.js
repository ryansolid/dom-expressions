// Opt-in codec encoding for server-function ARGUMENTS. By default the
// client sends argument lists as plain JSON (the fast path — no serializer
// in the bundle) and throws on values JSON can't carry faithfully. Importing
// this entry and calling `enableRichArguments()` once at startup installs
// the codec for those calls — Dates, Maps, Sets, typed arrays, cyclic
// structures — at the cost of shipping the serializer's write half
// (~5 KB gz). Responses are unaffected: result values always travel through
// the codec, whose decode half the client carries regardless.
import { getServerFunctionsCodec, serializeString } from "./shared.js";
import { configureServerFunctionsClient } from "./client.js";

export function enableRichArguments() {
  configureServerFunctionsClient({
    serializeArgs: args => serializeString(args, getServerFunctionsCodec())
  });
}
