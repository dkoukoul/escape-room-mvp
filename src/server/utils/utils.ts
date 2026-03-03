// src/server/utils.ts

export function getPlayerRoom(socketId: string) {
  // Implement the logic to get the player's room based on socketId
}

export function checkIfHost(room, socketId) {
  // Check if the player is the host of the room
  return room.players.get(socketId)?.isHost;
}