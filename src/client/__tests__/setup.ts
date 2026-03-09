import { vi, afterEach } from "vitest";

// Mock import.meta.env for client tests
Object.defineProperty(globalThis, "import", {
  value: {
    meta: {
      env: {
        DEV: true,
        VITE_LOG_LEVEL: "debug",
      },
    },
  },
  writable: true,
});

// Mock socket.io-client
vi.mock("socket.io-client", () => {
  const mockSocket = {
    id: "test-socket-id",
    connected: true,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    io: vi.fn(() => mockSocket),
  };
});

// Mock logger to avoid console noise during tests
vi.mock("@client/logger.ts", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock visual-fx to avoid animation issues
vi.mock("@client/lib/visual-fx.ts", () => ({
  startRandomFX: vi.fn(),
  stopRandomFX: vi.fn(),
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});
