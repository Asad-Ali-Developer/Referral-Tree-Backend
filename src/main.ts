import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { allowedHeaders, allowedOrigins } from "./utils";
import * as passport from "passport";
import cookieParser = require("cookie-parser");
import { json, urlencoded } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin: any, callback: any) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: allowedHeaders,
  });

  app.use(passport.initialize());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());
  app.use(json());
  app.use(urlencoded({ extended: true }));

  const port = process.env.PORT ?? 8080;

  await app.listen(port);

  console.log(`Referral Tree API listening on port ${port}`);
}

bootstrap();
