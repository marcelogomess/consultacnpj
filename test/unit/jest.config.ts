import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../..',
  testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '<rootDir>/src/**/*.(t|j)s',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/**/*.module.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@prisma-service/(.*)$': '<rootDir>/src/prisma/$1',
  },
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
};

export default config;
