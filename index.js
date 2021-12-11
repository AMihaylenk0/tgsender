const Prismic = require('@prismicio/client')
const apiEndpoint = 'https://nbamania.prismic.io/api/v2'
const Client = Prismic.client(apiEndpoint)
const {Api, TelegramClient} = require('telegram');
const {StringSession} = require('telegram/sessions');
const input = require('input'); // npm i input
const axios = require('axios');
require('dotenv').config()

async function savePostId( postId, releaseDate ) {
    const data = JSON.stringify({
        "collection": "posts",
        "database": `${process.env.DATABASE_NAME}`,
        "dataSource": "Cluster0",
        "document": {
            "postId": postId,
            "releaseDate": releaseDate
        }
    });
                
    const config = {
        method: 'post',
        url: 'https://data.mongodb-api.com/app/data-vvmdy/endpoint/data/beta/action/insertOne',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Request-Headers': '*',
            'api-key': `${process.env.MONGODB_KEY}`
        },
        data : data
    };
                
    try {
        let { data } = await axios(config)
        console.log(JSON.stringify(data));
        return data;
    } catch (error) {
        console.log(error.response); 
        return error.response;
    }
}

async function findPost(postId) {
    const data = JSON.stringify({
        "collection": "posts",
        "database": `${process.env.DATABASE_NAME}`,
        "dataSource": "Cluster0",
        "projection": {
            "_id": 0
        },
        "filter": { "postId": postId }
    });
                
    const config = {
        method: 'post',
        url: 'https://data.mongodb-api.com/app/data-vvmdy/endpoint/data/beta/action/findOne',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Request-Headers': '*',
            'api-key': `${process.env.MONGODB_KEY}`
        },
        data : data
    };
                
    try {
        let { data } = await axios(config)
        return data;
    } catch (error) {
        console.log(error.response); 
        return error.response;
    }
    
}

function getInputMediaType(input) {
    if (input?.media?.url) {
        return new Api.InputMediaDocumentExternal({url: input.media.url})
    } else if (input?.image?.url) {
        return new Api.InputMediaPhotoExternal({url: input.image.url})
    } else {
        // throw new Error("Media file not found");
        console.log('Media file not found')
    }
} 

;(async () => {
  const predictions = await Client.query([
    Prismic.Predicates.at('my.predictions.date', new Date().toLocaleDateString('en-CA'))
  ])
  if (predictions.results.length) {
    for (const prediction of predictions.results) {
        let foundPost = await findPost(prediction.id)
        if (!foundPost.document) {
            await savePostId(prediction.id)
            await postToTelegram(prediction)
        }
    }
    process.exit(0)
  }
})()

async function postToTelegram(prediction) {
    const api_id = Number(process.env.TELEGRAM_API_ID);
    const api_hash = `${process.env.TELEGRAM_API_HASH}`;
    const session = new StringSession(`${process.env.TELEGRAM_API_SESSION}`);

    const client = new TelegramClient(
        session,
        api_id,
        api_hash, 
        {}
    );
    await client.start({
        phoneNumber: async () => await input.text('number ?'),
        password: async () => await input.text('password?'),
        phoneCode: async () => await input.text('Code ?'),
        onError: err => console.log(err),
    });
    // console.log(client.session.save()); // Save this string to avoid logging in again
    // await client.sendMessage('me', { message: 'Hello!' });

    client.setParseMode("html")
    await client.sendFile("me",{
        file: getInputMediaType(prediction?.data),
        caption: prediction?.data?.title?.[0]?.text
    });
    // console.log("parse mode is :",  client.parseMode)
    // console.log("parse mode is :",  client.parseMode)

    // await client.invoke(new Api.messages.SendMedia({
    //     peer: 'me',
    //     media: getInputMediaType(prediction?.data),
    //     // message: prediction?.data?.title?.[0]?.text,
    //     message: "Hello **world!**"
    //     // entities: [prediction?.data?.rich_text?.[0]?.text]
    // }));
}
