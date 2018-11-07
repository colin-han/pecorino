module.exports = {
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy'
  },
  moduleFileExtensions: [
    'app.dev.js',
    'dev.js',
    'js'
  ],
  moduleDirectories: [
    'node_modules',
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  testPathIgnorePatterns: [
    'dist'
  ]
};
