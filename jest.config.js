module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  
  moduleNameMapping: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@env/(.*)$': '<rootDir>/src/environments/$1',
    '^@arcgis/core/(.*)$': '<rootDir>/node_modules/@arcgis/core/$1'
  },

  // CRITICAL FIX: Properly handle ArcGIS and other ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@arcgis/core|@angular|rxjs))'
  ],

  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      }
    ]
  },

  // Handle ECMAScript Modules
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'html'],

  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ]
};