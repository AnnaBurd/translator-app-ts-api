# <img src="https://raw.githubusercontent.com/AnnaBurd/translator-app-ts-front/492b9d9e7c1deacd02e615f8c5ffb2988676da7e/public/icon.svg" width="48" style="margin-bottom:-16px"> Translator AI App

> Empowered by advanced AI model APIs (Open AI / Azure), this application facilitates seamless translations of technical documentation based on context.

The translator app is an essential tool for businesses that require accurate translations of technical documentation. While popular text translation tools like Google Translate and commercial deep-learning-based solutions are effective for common communication topics, they often fall short when it comes to less commonly used languages or highly specialized terminology.

For instance, the bi-lingual international company the application was initially designed for requires all technical documents to be provided in both Russian and Vietnamese languages. Unfortunately, existing translation tools frequently produce unreadable gibberish due to the narrow-field terminology involved. This results in a significant amount of manual labor being required on what should otherwise be an automatable task.

To address this issue, we have developed an AI-powered application designed specifically for enhancing the accuracy of translations by utilizing private databases with pre-existing samples from various fields and industries. By doing so, we can significantly improve efficiency while also reducing costs associated with manual corrections - ultimately providing better quality service overall!

[**View Live** _(\* might requre a few minutes to warm up server)_](https://translatorai.tech/ "Translator App")

## Key Features

- Private dataset of translation samples within a vector database
- Versatile cloud and local file storage optionsc
- Robust security ensured through JWT-based authentication and role-specific authorization
- Comprehensive user profile system that allows to easily reset password, change email address and other personal information
- Automated email notifications
- Set up to run in any environment within docker container

## Build with

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-%23FF6F00.svg?style=for-the-badge&logo=TensorFlow&logoColor=white)
![Azure](https://img.shields.io/badge/azure-%230072C6.svg?style=for-the-badge&logo=microsoftazure&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white)
![Swagger](https://img.shields.io/badge/-Swagger-%23Clojure?style=for-the-badge&logo=swagger&logoColor=white)

## Roadmap

- [x] Update samples dataset (complete, add new data as required)
- [ ] Tests Coverage
- [ ] Allow to edit AI-generated translations and include edited versions into prompts as user-provided samples
- [ ] Calculate spendings in USD and allow to set hard and soft limits

## Installation

Add `.env` file on place of the `.env.example` file in the root folder and fill in secret api/database tokens.

Linux & Windows:

```bash
npm install     # Install dependencies
npm run dev     # Run in development mode

npm run build   # Build production version
npm start       # Run
```

Docker:

```
# Build files
npm run build

# Build docker image
docker build -t <any-image-name:tag> .

# Push image to the docker hub
docker tag <any-image-name:tag> <docker-username>/<any-image-name:tag>
docker push <docker-username>/<any-image-name:tag>

# Run docker container using image, locally or on hosting
# When running container, make sure to expose port that is specified in the .env PORT variable, and to update api URL on the frontend side

```

This will run the backend (api) part of the application, the frontend (client) is [here](https://github.com/AnnaBurd/translator-app-ts-front)

## Usage

[API Reference](https://app.swaggerhub.com/apis-docs/MANUTA1992_1/translator-app-api/1.0.0)

## Contributing

1. Fork project (<https://github.com/annaburd/translator-app-ts-api/fork>)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request

## Support

[Report Bug](https://github.com/annaburd/translator-app-ts-api/issues)
·
[Discuss Issues](https://www.linkedin.com/in/anna-burdanova-b91453218)
