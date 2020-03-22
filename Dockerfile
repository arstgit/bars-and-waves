FROM node
RUN apt-get update && apt-get install fortune -y

COPY . /app
WORKDIR /app
RUN npm install
EXPOSE 80
CMD npm start
