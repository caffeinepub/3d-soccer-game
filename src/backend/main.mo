import Map "mo:core/Map";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // User profile management functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Game-specific types and data structures
  public type GameMode = {
    #freeKick;
    #penalty;
    #kickoff;
  };

  public type HighScoreEntry = {
    player : Principal;
    score : Nat;
    timestamp : Int;
    mode : GameMode;
  };

  module HighScoreEntry {
    public func compare(entry1 : HighScoreEntry, entry2 : HighScoreEntry) : Order.Order {
      // Compare by score (descending)
      switch (Nat.compare(entry2.score, entry1.score)) {
        case (#equal) {
          // If scores are equal, compare by timestamp (ascending)
          Int.compare(entry1.timestamp, entry2.timestamp);
        };
        case (order) { order };
      };
    };
  };

  let highScores = Map.empty<Principal, HighScoreEntry>();

  func getAllScoresByMode(mode : GameMode) : [HighScoreEntry] {
    highScores.values().toArray().filter(
      func(entry) {
        entry.mode == mode;
      }
    );
  };

  func getTopScoresByMode(mode : GameMode, count : Nat) : [HighScoreEntry] {
    let filteredEntries = getAllScoresByMode(mode);
    filteredEntries.sliceToArray(0, count);
  };

  func getBestScoreForPlayer(player : Principal, mode : GameMode) : ?HighScoreEntry {
    highScores.get(player);
  };

  // Public query functions - no authentication required (open to all including guests)
  public query ({ caller }) func getTopScores(mode : GameMode) : async [HighScoreEntry] {
    getTopScoresByMode(mode, 10);
  };

  public query ({ caller }) func getPlayerBestScore(player : Principal, mode : GameMode) : async ?HighScoreEntry {
    getBestScoreForPlayer(player, mode);
  };

  public query ({ caller }) func getPlayerTopScores(player : Principal) : async {
    freeKick : ?HighScoreEntry;
    penalty : ?HighScoreEntry;
    kickoff : ?HighScoreEntry;
  } {
    {
      freeKick = getBestScoreForPlayer(player, #freeKick);
      penalty = getBestScoreForPlayer(player, #penalty);
      kickoff = getBestScoreForPlayer(player, #kickoff);
    };
  };

  // Submit high score - requires user authentication
  public shared ({ caller }) func submitHighScore(score : Nat, timestamp : Int, mode : GameMode) : async () {
    // Require user role (not guest, not anonymous)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can submit scores");
    };

    let newEntry : HighScoreEntry = {
      player = caller;
      score;
      timestamp;
      mode;
    };

    switch (highScores.get(caller)) {
      case (null) {
        highScores.add(caller, newEntry);
      };
      case (?existing) {
        if (score > existing.score) {
          highScores.add(caller, newEntry);
        };
      };
    };
  };
};
