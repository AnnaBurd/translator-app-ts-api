import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Translator App API",
    version: "1.0.0",
    description:
      "Empowered by advanced AI model APIs (Open AI / Azure), this application facilitates seamless translations of technical documentation based on context. <br/><br/> Here you can find full API reference for the **[Translator App](https://translatorai.tech/)** *([View GitHub](https://github.com/AnnaBurd/translator-app-ts-api))*",
    license: {
      name: "MIT",
      url: "https://spdx.org/licenses/MIT.html",
    },
    contact: {
      name: "developers team",
      email: "manuta1992@gmail.com",
    },
  },
  servers: [
    { url: "http://192.168.1.8:3000", description: "Development server" },
    {
      url: "https://translator-app-api.azurewebsites.net",
      description: "Production server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ["./src/controllers/**/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
