import { Express } from 'express';
import cors from 'cors';
import express from 'express';

export const setupMiddleware = (app: Express): void => {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
};

