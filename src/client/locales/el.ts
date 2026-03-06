// Greek translations
export default {
  // General
  common: {
    loading: "Φόρτωση...",
    error: "Σφάλμα",
    success: "Επιτυχία",
    yes: "Ναι",
    no: "Όχι",
    ok: "ΟΚ",
    cancel: "Ακύρωση",
    next: "Επόμενο",
    back: "Πίσω",
    start: "Έναρξη",
    continue: "Συνέχεια",
    skip: "Παράλειψη",
    ready: "Έτοιμος",
    waiting: "Αναμονή",
    word: "Λέξη",
    words: "Λέξεις",
    captured: "Αιχμαλωτισμένα",
    completed: "ολοκληρώθηκαν",
    submit: "ΥΠΟΒΟΛΗ",
    reset: "Επαναφορά",
    play_again: "Ξαναπαίξτε",
    try_again: "Δοκιμάστε ξανά",
  },

  // Lobby screen
  lobby: {
    title: "ODYSSEY",
    subtitle: "cYBER PROTOCOL",
    input: {
      name_placeholder: "Το ψευδώνυμό σας",
      room_placeholder: "κωδικός δωματίου",
    },
    buttons: {
      join: "Σύνδεση",
      create_room: "Νέο Δωμάτιο",
      leave: "Αποχώρηση",
      start_mission: "⚡ Έναρξη Αποστολής",
    },
    status: {
      connected_players: "{{count}} ΠΑΙΚΤΕΣ ΣΥΝΔΕΔΕΜΕΝΟΙ",
      waiting_host: "Αναμονή για έναρξη...",
      room_code: "ΚΩΔΙΚΟΣ ΔΩΜΑΤΙΟΥ",
      select_mission: "ΕΠΙΛΕΓΜΕΝΗ ΑΠΟΣΤΟΛΗ",
      mission_details: "{{puzzle_count}} ΠΑΖΛ | {{min_players}}-{{max_players}} ΠΑΙΚΤΕΣ",
      dev_jump_to: "ΕΚΚΙΝΗΣΗ ΣΕ ΠΑΖΛ (DEV ONLY)",
      normal_start: "Κανονική Έναρξη (Με Εισαγωγή)",
      jump_to_puzzle: "Μετάβαση στο {{index}}. {{title}}",
    },
    errors: {
      enter_callsign: "Εισάγετε το ψευδώνυμό σας.",
      enter_room_code: "Εισάγετε κωδικό δωματίου.",
    },
    leaderboard: {
      title: "🏆 LEADERBOARD 🏆",
      rank: "#",
      team: "ΟΜΑΔΑ",
      score: "ΒΑΘΜΟΛΟΓΙΑ",
    },
    footer: {
      github_link: "Ο Odyssey είναι μια πλατφόρμα δωματίων διαφυγής ανοιχτού κώδικα — GitHub Repo",
    },
  },

  // Level intro screen
  level_intro: {
    narrative_protocol: "Πρωτόκολλο Αφηγηματικού Συστήματος",
    mission_sync: "ΣΥΓΧΡΟΝΙΣΜΟΣ ΑΠΟΣΤΟΛΗΣ",
    synchronizing: "Συγχρονισμός μετάδοσης...",
    incoming_audio: "Εισερχόμενη Ροή Ήχου...",
    transmission_complete: "Η μετάδοση ολοκληρώθηκε. Αναμονή χειροκίνητης παρέμβασης.",
    initialize_mission: "ΕΝΕΡΓΟΠΟΙΗΣΗ ΑΠΟΣΤΟΛΗΣ",
    waiting_crew: "ΑΝΑΜΟΝΗ ΓΙΑ ΠΛΗΡΩΜΑ...",
  },

  // Briefing screen
  briefing: {
    mission_progress: "ΑΠΟΣΤΟΛΗ {{current}} / {{total}}",
    incoming_transmission: "Εισερχόμενη μετάδοση...",
    waiting_others: "ΑΝΑΜΟΝΗ ΓΙΑ ΥΠΟΛΟΙΠΟΥΣ ({{ready}}/{{total}})",
    waiting_others_dots: "ΑΝΑΜΟΝΗ ΓΙΑ ΥΠΟΛΟΙΠΟΥΣ...",
  },

  // HUD
  hud: {
    time: "ΧΡΟΝΟΣ",
    mission: "ΑΠΟΣΤΟΛΗ",
    glitch: "ΛΑΘΗ",
    role: "ΡΟΛΟΣ",
    mute: "Εναλλαγή Μουσικής",
  },

  // Puzzle common
  puzzle: {
    unknown_type: "Άγνωστος τύπος παζλ: {{type}}",
  },

  // Asymmetric Symbols puzzle
  asymmetric_symbols: {
    title: "Τα Νέον Προπύλαια",
    navigator_role: "Πλοηγός",
    decoder_role: "Αποκωδικοποιητής",
    navigator_desc: "Βλέπεις τις αρχαίες λέξεις. Καθοδήγησε την ομάδα σου.",
    decoder_desc: "Πιάσε τα γράμματα για να σχηματίσεις τη λέξη.",
  },

  // Rhythm Tap puzzle
  rhythm_tap: {
    title: "Η Συχνότητα του Μαντείου",
    oracle_role: "Μάντης",
    hoplite_role: "Χοπλίτης",
    oracle_desc: "Μόνο εσύ έχεις το όραμα. Καθοδήγησε την ομάδα στο σωστό ρυθμό.",
    hoplite_desc: "Άκουσε προσεκτικά και πάτα με τη σωστή σειρά.",
    round_progress: "Γύρος {{current}} / {{total}}",
    watch_sequence: "Παρακολούθησε την ακολουθία...",
    tap_sequence: "Πάτα την ακολουθία...",
    your_taps: "Οι πατήματά σου: {{sequence}}",
    submit: "Υποβολή Ακολουθίας",
  },

  // Collaborative Wiring puzzle
  collaborative_wiring: {
    title: "Οι Κίονες της Λογικής",
    engineer_role: "Μηχανικός",
    engineer_desc: "Πάτα τους διακόπτες ώστε να ανάψουν όλες οι ασφάλειες.",
    column_powered: "ΚΊΟΝΑΣ {{index}} ΕΝΕΡΓΟΠΟΙΗΜΕΝΟΣ",
    all_columns: "ΌΛΟΙ ΟΙ ΚΊΟΝΕΣ ΕΝΕΡΓΟΠΟΙΗΜΕΝΟΙ!",
    checking_solution: "Έλεγχος λύσης...",
    solution_correct: "Η λύση είναι σωστή!",
    attempts_remaining: "{{count}} προσπάθειες απομένουν",
  },

  // Cipher Decode puzzle
  cipher_decode: {
    title: "Ο Κώδικας του Φιλοσόφου",
    cryptographer_role: "Κρυπτογράφος",
    scribe_role: "Γραφέας",
    cryptographer_desc: "Κρατάς τα κλειδιά της κρυπτογράφησης. Μοιράσου τα σοφά.",
    scribe_desc: "Αποκρυπτογράφησε τις λέξεις και μοιράσου τη γνώση.",
    decrypted: "ΑΠΟΚΡΥΠΤΟΓΡΑΦΗΜΕΝΟ:",
    hint: "Υπόδειξη: {{letter}}",
    submit_word: "Υποβολή Λέξης",
  },

  // Collaborative Assembly puzzle
  collaborative_assembly: {
    title: "Η Ανακατασκευή του Παρθενώνα",
    architect_role: "Αρχιτέκτονας",
    builder_role: "Χτίστης",
    architect_desc: "Βλέπεις το τελικό σχέδιο και τις περιστροφές. Καθοδήγησε την ομάδα.",
    builder_desc: "Έχεις τα κομμάτια. Περίστρεψε και τοποθέτησέ τα σύμφωνα με τις οδηγίες.",
    rotate_hint: "Σύρε για μετακίνηση, Κύλισε για περιστροφή",
    placed_pieces: "Τοποθετημένα: {{placed}}/{{total}}",
    checking_solution: "Έλεγχος λύσης...",
    solution_correct: "Η λύση είναι σωστή!",
  },

  // Alphabet Wall puzzle
  alphabet_wall: {
    title: "Ο Τοίχος του Αλφαβήτου",
    // Add translations as needed
  },

  // Demogorgon Hunt puzzle
  demogorgon_hunt: {
    title: "Η Κυνήγηση του Δαιμονίου",
    // Add translations as needed
  },

  // Results screen
  results: {
    victory: {
      title: "Η ΑΠΟΣΤΟΛΗ ΟΛΟΚΛΗΡΩΘΗΚΕ",
      subtitle: "Ο Παρθενώνας έχει αποκατασταθεί. Η δημοκρατία σώθηκε.",
      stats: {
        time: "ΧΡΟΝΟΣ",
        glitch: "ΔΙΑΚΥΜΑΝΣΗ",
        puzzles: "ΠΑΖΛ",
        score: "ΒΑΘΜΟΛΟΓΙΑ",
      },
    },
    defeat: {
      title: "Η ΑΠΟΣΤΟΛΗ ΑΠΕΤΥΧΕ",
      reason: {
        timer: "Ο χρόνος έληξε. Ο Ιός του Χρόνου κατέβαλε την Αρχαία Ελλάδα.",
        glitch: "Υπερφόρτωση διακύμανσης. Η προσομοίωση κατέρρευσε.",
      },
      stats: {
        reached: "ΕΦΤΑΣΕ",
        completed: "ΟΛΟΚΛΗΡΩΜΕΝΑ",
        cause: "ΑΙΤΙΑ",
      },
    },
  },

  // Roles
  roles: {
    navigator: "Πλοηγός",
    decoder: "Αποκωδικοποιητής",
    oracle: "Μάντης",
    hoplite: "Χοπλίτης",
    engineer: "Μηχανικός",
    cryptographer: "Κρυπτογράφος",
    scribe: "Γραφέας",
    architect: "Αρχιτέκτονας",
    builder: "Χτίστης",
  },
};