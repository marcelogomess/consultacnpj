import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../..',
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/integration/setup/test-db.ts',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@prisma-service/(.*)$': '<rootDir>/src/prisma/$1',
  },
};

export default config;
