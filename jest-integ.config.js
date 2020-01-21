module.exports = {
    roots: [
        "<rootDir>/tst-integ",
    ],
    testMatch: [
        "**/?(*.)+(spec|test).+(ts|tsx|js)",
    ],
    transform: {
      "^.+\\.(ts|tsx)$": "ts-jest",
    },
    collectCoverage: false,
};
