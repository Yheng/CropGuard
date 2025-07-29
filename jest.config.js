/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'Backend Tests',
      testMatch: ['<rootDir>/backend/tests/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.js'],
      collectCoverageFrom: [
        'backend/src/**/*.js',
        '!backend/src/index.js',
        '!backend/src/scripts/**',
        '!backend/src/config/**'
      ],
      coverageDirectory: '<rootDir>/coverage/backend',
      coverageReporters: ['text', 'lcov', 'html'],
      testTimeout: 30000
    },
    {
      displayName: 'Frontend Tests',
      testMatch: ['<rootDir>/frontend/src/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/frontend/src/setupTests.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'frontend/tsconfig.json'
        }]
      },
      collectCoverageFrom: [
        'frontend/src/**/*.{ts,tsx}',
        '!frontend/src/main.tsx',
        '!frontend/src/vite-env.d.ts',
        '!frontend/src/**/*.d.ts'
      ],
      coverageDirectory: '<rootDir>/coverage/frontend',
      coverageReporters: ['text', 'lcov', 'html']
    }
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};