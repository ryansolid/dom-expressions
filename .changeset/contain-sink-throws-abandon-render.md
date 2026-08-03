---
"@dom-expressions/runtime": patch
---

Treat a throwing stream sink or a cancelled readable as client disconnect. A `pipe` sink whose `write`/`end` throws (e.g. a web-stream adapter enqueueing after close) previously let the throw escape from deferred write machinery (`writeTasks`, late fragment flushes run from the microtask queue) as an unhandled error that could take the host process down. Sink invocations are now guarded: a throw stops all further sink calls, marks the render completed so pending fragment resolutions stop emitting and serializing, and disposes in-flight reactive work. `pipeTo` write rejections and a rejected writer `closed` (which is how cancelling `renderToStream(...).readable` surfaces) trigger the same teardown and settle the `pipeTo` promise, so an aborted request winds the render down instead of computing fragments for a dead stream.
