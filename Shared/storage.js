/* Quiz Builder — shared Local Storage data layer (vanilla JS, no deps).
 * Includes a compatibility/migration layer so older quiz records stay playable.
 */
(function (global) {
  "use strict";

  var KEYS = {
    users: "qb.users",
    session: "qb.session",
    quizzes: "qb.quizzes",
    attempts: "qb.attempts",
    activeAttempt: "qb.activeAttempt",
    schema: "qb.schemaVersion"
  };

  var SCHEMA_VERSION = 2;

  /* ---------------- low level ---------------- */
  function read(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 8);
  }

  /* ---------------- hashing (obfuscation only, client-side app) ---------------- */
  function hashPassword(password) {
    var str = "qb::" + String(password);
    var h1 = 0x811c9dc5, h2 = 0x1000193;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h1 = (h1 ^ c) >>> 0;
      h1 = (h1 * 16777619) >>> 0;
      h2 = ((h2 << 5) - h2 + c) >>> 0;
    }
    return h1.toString(16) + "-" + h2.toString(16) + "-" + str.length.toString(16);
  }

  /* ---------------- compatibility layer ---------------- */
  var TYPES = ["multiple-choice", "true-false", "text"];

  function normalizeType(type) {
    var t = String(type || "").toLowerCase().replace(/[\s_]+/g, "-");
    if (t === "mc" || t === "multiple" || t === "mcq" || t === "choice" || t === "multiple-choice") return "multiple-choice";
    if (t === "tf" || t === "boolean" || t === "truefalse" || t === "true-false") return "true-false";
    if (t === "short" || t === "short-answer" || t === "open" || t === "text") return "text";
    return TYPES.indexOf(t) >= 0 ? t : "multiple-choice";
  }

  function normalizeQuestion(raw, index) {
    var q = raw && typeof raw === "object" ? raw : {};
    var type = normalizeType(q.type);
    var options = [];
    if (Array.isArray(q.options)) {
      options = q.options.map(function (o) {
        if (o && typeof o === "object") return String(o.text !== undefined ? o.text : o.label || "");
        return String(o === undefined || o === null ? "" : o);
      });
    } else if (Array.isArray(q.choices)) {
      options = q.choices.map(function (o) { return String(o); });
    }

    var answer = q.answer;
    if (answer === undefined) answer = q.correct !== undefined ? q.correct : q.correctAnswer;

    if (type === "true-false") {
      options = ["True", "False"];
      var a = String(answer === undefined ? "true" : answer).toLowerCase();
      if (a === "0") a = "true";
      else if (a === "1") a = "false";
      answer = (a === "true" || a === "t" || a === "yes") ? "true" : "false";
    } else if (type === "multiple-choice") {
      while (options.length < 2) options.push("");
      // legacy records may store the correct option text instead of its index
      var idx = typeof answer === "number" ? answer : parseInt(answer, 10);
      if (isNaN(idx)) {
        idx = options.findIndex(function (o) {
          return String(o).trim().toLowerCase() === String(answer || "").trim().toLowerCase();
        });
      }
      if (idx < 0 || idx >= options.length) idx = 0;
      answer = idx;
    } else {
      options = [];
      answer = String(answer === undefined || answer === null ? "" : answer);
    }

    return {
      id: q.id || uid("q"),
      type: type,
      text: String(q.text !== undefined ? q.text : (q.question || q.prompt || "")),
      image: typeof q.image === "string" && q.image ? q.image : (typeof q.imageData === "string" ? q.imageData : ""),
      options: options,
      answer: answer,
      explanation: String(q.explanation !== undefined ? q.explanation : (q.reason || q.feedback || ""))
    };
  }

  /* Readable text of the correct answer for any question type. */
  function correctAnswerText(question) {
    var q = normalizeQuestion(question, 0);
    if (q.type === "multiple-choice") return q.options[Number(q.answer)] !== undefined ? q.options[Number(q.answer)] : "";
    if (q.type === "true-false") return String(q.answer) === "true" ? "True" : "False";
    return String(q.answer || "").split("|")[0].trim();
  }

  /* Readable text of a given (participant) answer. */
  function givenAnswerText(question, given) {
    if (given === null || given === undefined || String(given).trim() === "") return "Not answered";
    var q = normalizeQuestion(question, 0);
    if (q.type === "multiple-choice") return q.options[Number(given)] !== undefined ? q.options[Number(given)] : String(given);
    if (q.type === "true-false") return String(given).toLowerCase() === "true" ? "True" : "False";
    return String(given);
  }

  function normalizeQuiz(raw) {
    var q = raw && typeof raw === "object" ? raw : {};
    var questions = Array.isArray(q.questions) ? q.questions : [];
    var seconds = q.timeLimitSeconds;
    if (seconds === undefined || seconds === null) {
      // legacy records stored minutes
      var mins = q.timeLimit !== undefined ? q.timeLimit : q.duration;
      seconds = mins === undefined || mins === null ? 300 : Math.round(Number(mins) * 60);
    }
    seconds = Number(seconds);
    if (!isFinite(seconds) || seconds <= 0) seconds = 300;

    return {
      id: q.id || uid("quiz"),
      code: String(q.code || q.quizCode || makeCode()).toUpperCase(),
      title: String(q.title || q.name || "Untitled quiz"),
      description: String(q.description || ""),
      ownerId: q.ownerId || q.userId || q.owner || "",
      ownerName: q.ownerName || "",
      timeLimitSeconds: seconds,
      createdAt: q.createdAt || new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      questions: questions.map(normalizeQuestion)
    };
  }

  function makeCode() {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var code = "";
    for (var i = 0; i < 6; i++) code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return code;
  }

  /* ---------------- users & session ---------------- */
  function getUsers() {
    var list = read(KEYS.users, []);
    return Array.isArray(list) ? list : [];
  }

  function findUserByEmail(email) {
    var target = String(email || "").trim().toLowerCase();
    return getUsers().filter(function (u) { return String(u.email).toLowerCase() === target; })[0] || null;
  }

  function signup(name, email, password) {
    name = String(name || "").trim();
    email = String(email || "").trim().toLowerCase();
    if (!name) return { ok: false, error: "Please enter your name." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: "Please enter a valid email address." };
    if (String(password || "").length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    if (findUserByEmail(email)) return { ok: false, error: "An account with this email already exists." };

    var user = {
      id: uid("user"),
      name: name.slice(0, 60),
      email: email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    };
    var users = getUsers();
    users.push(user);
    write(KEYS.users, users);
    setSession(user);
    return { ok: true, user: publicUser(user) };
  }

  function login(email, password) {
    var user = findUserByEmail(email);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return { ok: false, error: "Email or password is incorrect." };
    }
    setSession(user);
    return { ok: true, user: publicUser(user) };
  }

  function publicUser(u) {
    return { id: u.id, name: u.name, email: u.email };
  }

  function setSession(user) {
    write(KEYS.session, { userId: user.id, name: user.name, email: user.email, at: Date.now() });
  }

  function getSession() {
    var s = read(KEYS.session, null);
    if (!s || !s.userId) return null;
    var users = getUsers();
    for (var i = 0; i < users.length; i++) if (users[i].id === s.userId) return publicUser(users[i]);
    return null;
  }

  function logout() {
    try { global.localStorage.removeItem(KEYS.session); } catch (e) {}
  }

  /* ---------------- quizzes ---------------- */
  function getAllQuizzes() {
    var list = read(KEYS.quizzes, []);
    if (!Array.isArray(list)) list = [];
    return list.map(normalizeQuiz);
  }

  function saveAllQuizzes(list) {
    write(KEYS.quizzes, list);
    write(KEYS.schema, SCHEMA_VERSION);
  }

  function getQuizzesByOwner(ownerId) {
    return getAllQuizzes().filter(function (q) { return q.ownerId === ownerId; })
      .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  }

  function getQuizById(id) {
    return getAllQuizzes().filter(function (q) { return q.id === id; })[0] || null;
  }

  function getQuizByCode(code) {
    var target = String(code || "").trim().toUpperCase();
    if (!target) return null;
    return getAllQuizzes().filter(function (q) { return q.code === target; })[0] || null;
  }

  function uniqueCode() {
    var existing = {};
    getAllQuizzes().forEach(function (q) { existing[q.code] = true; });
    var code = makeCode();
    var guard = 0;
    while (existing[code] && guard++ < 200) code = makeCode();
    return code;
  }

  function saveQuiz(quiz) {
    var normalized = normalizeQuiz(quiz);
    if (!normalized.code) normalized.code = uniqueCode();
    var all = getAllQuizzes();
    var replaced = false;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === normalized.id) { all[i] = normalized; replaced = true; break; }
    }
    if (!replaced) all.push(normalized);
    saveAllQuizzes(all);
    return normalized;
  }

  function deleteQuiz(id) {
    var all = getAllQuizzes().filter(function (q) { return q.id !== id; });
    saveAllQuizzes(all);
    var attempts = getAllAttempts().filter(function (a) { return a.quizId !== id; });
    write(KEYS.attempts, attempts);
    return true;
  }

  /* ---------------- attempts & scoring ---------------- */
  function getAllAttempts() {
    var list = read(KEYS.attempts, []);
    return Array.isArray(list) ? list : [];
  }

  function getAttemptsForQuiz(quizId) {
    return getAllAttempts().filter(function (a) { return a.quizId === quizId; });
  }

  function getAttempt(id) {
    return getAllAttempts().filter(function (a) { return a.id === id; })[0] || null;
  }

  function normalizeText(value) {
    return String(value === undefined || value === null ? "" : value)
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.,!?;:]+$/g, "")
      .trim();
  }

  function isCorrect(question, answer) {
    var q = normalizeQuestion(question, 0);
    if (answer === undefined || answer === null || answer === "") return false;
    if (q.type === "multiple-choice") return Number(answer) === Number(q.answer);
    if (q.type === "true-false") return String(answer).toLowerCase() === String(q.answer).toLowerCase();
    var accepted = String(q.answer).split("|").map(normalizeText).filter(Boolean);
    var given = normalizeText(answer);
    return accepted.indexOf(given) >= 0;
  }

  function scoreQuiz(quiz, answers) {
    var normalized = normalizeQuiz(quiz);
    var details = normalized.questions.map(function (q) {
      var given = answers ? answers[q.id] : undefined;
      var answered = !(given === undefined || given === null || String(given).trim() === "");
      return {
        questionId: q.id,
        type: q.type,
        text: q.text,
        given: answered ? given : null,
        givenText: givenAnswerText(q, answered ? given : null),
        correctText: correctAnswerText(q),
        explanation: q.explanation || "",
        correct: answered && isCorrect(q, given)
      };
    });
    var correct = details.filter(function (d) { return d.correct; }).length;
    var answered = details.filter(function (d) { return d.given !== null; }).length;
    var total = details.length;
    return {
      total: total,
      correct: correct,
      wrong: answered - correct,
      skipped: total - answered,
      percent: total ? Math.round((correct / total) * 100) : 0,
      details: details
    };
  }

  function saveAttempt(attempt) {
    var record = {
      id: attempt.id || uid("attempt"),
      quizId: attempt.quizId,
      quizTitle: attempt.quizTitle,
      quizCode: attempt.quizCode,
      participantName: attempt.participantName || "Guest",
      answers: attempt.answers || {},
      result: attempt.result,
      autoSubmitted: !!attempt.autoSubmitted,
      submittedAt: new Date().toISOString()
    };
    var all = getAllAttempts();
    all.push(record);
    write(KEYS.attempts, all);
    return record;
  }

  /* active attempt (in-progress play session) */
  function setActiveAttempt(state) { write(KEYS.activeAttempt, state); }
  function getActiveAttempt() { return read(KEYS.activeAttempt, null); }
  function clearActiveAttempt() { try { global.localStorage.removeItem(KEYS.activeAttempt); } catch (e) {} }

  /* ---------------- migration on load ---------------- */
  function migrate() {
    var version = Number(read(KEYS.schema, 0)) || 0;
    if (version < SCHEMA_VERSION) {
      var quizzes = getAllQuizzes(); // normalizeQuiz applied
      saveAllQuizzes(quizzes);
    }
  }

  var storage = {
    KEYS: KEYS,
    SCHEMA_VERSION: SCHEMA_VERSION,
    uid: uid,
    makeCode: makeCode,
    uniqueCode: uniqueCode,
    normalizeQuiz: normalizeQuiz,
    normalizeQuestion: normalizeQuestion,
    normalizeText: normalizeText,
    signup: signup,
    login: login,
    logout: logout,
    getSession: getSession,
    getUsers: getUsers,
    getAllQuizzes: getAllQuizzes,
    getQuizzesByOwner: getQuizzesByOwner,
    getQuizById: getQuizById,
    getQuizByCode: getQuizByCode,
    saveQuiz: saveQuiz,
    deleteQuiz: deleteQuiz,
    getAllAttempts: getAllAttempts,
    getAttemptsForQuiz: getAttemptsForQuiz,
    getAttempt: getAttempt,
    saveAttempt: saveAttempt,
    scoreQuiz: scoreQuiz,
    isCorrect: isCorrect,
    correctAnswerText: correctAnswerText,
    givenAnswerText: givenAnswerText,
    setActiveAttempt: setActiveAttempt,
    getActiveAttempt: getActiveAttempt,
    clearActiveAttempt: clearActiveAttempt
  };

  try { migrate(); } catch (e) { /* storage unavailable */ }

  global.QBStorage = storage;
})(window);
