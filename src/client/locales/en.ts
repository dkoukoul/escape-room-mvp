// English translations
export default {
  // General
  common: {
    loading: "Loading...",
    error: "Error",
    success: "Success",
    yes: "Yes",
    no: "No",
    ok: "OK",
    cancel: "Cancel",
    next: "Next",
    back: "Back",
    start: "Start",
    continue: "Continue",
    skip: "Skip",
    ready: "Ready",
    waiting: "Waiting",
    word: "Word",
    words: "Words",
    captured: "Captured",
    completed: "completed",
    submit: "SUBMIT",
    reset: "Reset",
    play_again: "Play Again",
    try_again: "Try Again",
  },

  // Lobby screen
  lobby: {
    title: "ODYSSEY",
    subtitle: "Cyber Protocol",
    input: {
      name_placeholder: "Your callsign",
      room_placeholder: "room code",
    },
    buttons: {
      join: "Join",
      create_room: "Create Room",
      leave: "Leave",
      start_mission: "⚡ Start Mission",
    },
    status: {
      connected_players: "{{count}} HOPLITE{{plural}} CONNECTED",
      waiting_host: "Waiting for host to start...",
      room_code: "ROOM CODE",
      select_mission: "SELECTED MISSION",
      mission_details: "{{puzzle_count}} PUZZLES | {{min_players}}-{{max_players}} PLAYERS",
      dev_jump_to: "START AT PUZZLE (DEV ONLY)",
      normal_start: "Normal Start (With Intro)",
      jump_to_puzzle: "Jump to {{index}}. {{title}}",
    },
    errors: {
      enter_callsign: "Enter your callsign.",
      enter_room_code: "Enter a room code.",
    },
    leaderboard: {
      title: "🏆 HALL OF FAME 🏆",
      rank: "#",
      team: "TEAM",
      score: "SCORE",
    },
    footer: {
      github_link: "Odyssey is an open source escape room platform — GitHub Repo",
    },
  },

  // Level intro screen
  level_intro: {
    narrative_protocol: "System Narrative Protocol",
    mission_sync: "MISSION SYNC",
    synchronizing: "Synchronizing transmission...",
    incoming_audio: "Incoming Audio Stream...",
    transmission_complete: "Transmission complete. Awaiting manual override.",
    initialize_mission: "INITIALIZE MISSION",
    waiting_crew: "WAITING FOR CREW...",
  },

  // Briefing screen
  briefing: {
    mission_progress: "MISSION {{current}} / {{total}}",
    incoming_transmission: "Incoming transmission...",
    waiting_others: "WAITING FOR OTHERS ({{ready}}/{{total}})",
    waiting_others_dots: "WAITING FOR OTHERS...",
  },

  // HUD
  hud: {
    time: "TIME",
    mission: "MISSION",
    glitch: "GLITCH",
    role: "ROLE",
    mute: "Toggle Music",
  },

  // Puzzle common
  puzzle: {
    unknown_type: "Unknown puzzle type: {{type}}",
  },

  // Asymmetric Symbols puzzle
  asymmetric_symbols: {
    title: "The Neon Propylaea",
    navigator_role: "Navigator",
    decoder_role: "Decoder",
    navigator_desc: "You see the ancient words. Guide your team.",
    decoder_desc: "Catch the letters to form the word.",
  },

  // Rhythm Tap puzzle
  rhythm_tap: {
    title: "The Oracle's Frequency",
    oracle_role: "Oracle",
    hoplite_role: "Hoplite",
    oracle_desc: "Only you have the vision. Guide your team to the correct rhythm.",
    hoplite_desc: "Listen carefully and tap in the correct order.",
    round_progress: "Round {{current}} / {{total}}",
    watch_sequence: "Watch the sequence...",
    tap_sequence: "Tap the sequence...",
    your_taps: "Your taps: {{sequence}}",
    submit: "Submit Sequence",
  },

  // Collaborative Wiring puzzle
  collaborative_wiring: {
    title: "The Columns of Logic",
    engineer_role: "Engineer",
    engineer_desc: "Press the switches to light all the fuses.",
    column_powered: "COLUMN {{index}} POWERED",
    all_columns: "ALL COLUMNS POWERED!",
    checking_solution: "Checking solution...",
    solution_correct: "Solution correct!",
    attempts_remaining: "{{count}} attempts remaining",
  },

  // Cipher Decode puzzle
  cipher_decode: {
    title: "The Philosopher's Cipher",
    cryptographer_role: "Cryptographer",
    scribe_role: "Scribe",
    cryptographer_desc: "You hold the encryption keys. Share them wisely.",
    scribe_desc: "Decrypt the words and share the knowledge.",
    decrypted: "DECRYPTED:",
    hint: "Hint: {{letter}}",
    submit_word: "Submit Word",
  },

  // Collaborative Assembly puzzle
  collaborative_assembly: {
    title: "The Parthenon Reconstruction",
    architect_role: "Architect",
    builder_role: "Builder",
    architect_desc: "You see the final blueprint and rotations. Guide the team.",
    builder_desc: "You hold the pieces. Rotate and place them according to instructions.",
    rotate_hint: "Drag to move, Scroll to rotate",
    placed_pieces: "Placed: {{placed}}/{{total}}",
    checking_solution: "Checking solution...",
    solution_correct: "Solution correct!",
  },

  // Alphabet Wall puzzle
  alphabet_wall: {
    title: "The Alphabet Wall",
    // Add translations as needed
  },

  // Demogorgon Hunt puzzle
  demogorgon_hunt: {
    title: "The Demogorgon Hunt",
    // Add translations as needed
  },

  // Results screen
  results: {
    victory: {
      title: "MISSION COMPLETE",
      subtitle: "The Parthenon has been restored. Democracy is saved.",
      stats: {
        time: "TIME",
        glitch: "GLITCH",
        puzzles: "PUZZLES",
        score: "SCORE",
      },
    },
    defeat: {
      title: "MISSION FAILED",
      reason: {
        timer: "Time has expired. The Chronos Virus has consumed Ancient Greece.",
        glitch: "Glitch overload. The simulation has collapsed.",
      },
      stats: {
        reached: "REACHED",
        completed: "COMPLETED",
        cause: "CAUSE",
      },
    },
  },

  // Roles
  roles: {
    navigator: "Navigator",
    decoder: "Decoder",
    oracle: "Oracle",
    hoplite: "Hoplite",
    engineer: "Engineer",
    cryptographer: "Cryptographer",
    scribe: "Scribe",
    architect: "Architect",
    builder: "Builder",
  },
};