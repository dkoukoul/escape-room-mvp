---
description: How to add a new socket event (client↔server communication)
---

# Add a New Socket Event

Socket events are the communication layer between client and server. All event names and payload types are defined in a single file.

## Steps

### 1. Define the event name

In `shared/events.ts`, add the event name to `ClientEvents` (client→server) or `ServerEvents` (server→client):

```typescript
export const ClientEvents = {
  // ...existing events
  MY_NEW_EVENT: "namespace:action", // ← add here
} as const;
```

Event names follow the pattern `"namespace:action"` (e.g., `"room:create"`, `"puzzle:action"`).

### 2. Define the payload interface

In the same file (`shared/events.ts`), add a payload interface:

```typescript
// Under "Client → Server Payloads" or "Server → Client Payloads" section
export interface MyNewEventPayload {
  someField: string;
  anotherField: number;
}
```

### 3. Add the server-side handler

In `src/server/index.ts`, inside the `io.on("connection", (socket) => { ... })` block:

```typescript
socket.on(ClientEvents.MY_NEW_EVENT, async (payload: MyNewEventPayload) => {
  try {
    const room = getPlayerRoom(socket.id);
    if (!room) return;

    // Handle the event...

    // Broadcast to room or respond to sender:
    io.to(room.code).emit(ServerEvents.SOME_RESPONSE, responseData);
    // or: socket.emit(ServerEvents.SOME_RESPONSE, responseData);
  } catch (error) {
    logger.error("Error handling my event", { error, socketId: socket.id });
  }
});
```

### 4. Add client-side emit/listener

**Emitting from client** (in a screen or puzzle file):

```typescript
import { emit, ClientEvents } from "../lib/socket.ts";
emit(ClientEvents.MY_NEW_EVENT, { someField: "value", anotherField: 42 });
```

**Listening on client** (in a screen init function):

```typescript
import { on, ServerEvents } from "../lib/socket.ts";
on(ServerEvents.SOME_RESPONSE, (data: SomeResponsePayload) => {
  // Update UI...
});
```

### 5. Verify

// turbo

```bash
bun run typecheck
```
