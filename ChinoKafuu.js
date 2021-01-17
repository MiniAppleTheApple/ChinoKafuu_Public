const fs = require('fs');
const Discord = require('discord.js');
const ytdl = require("ytdl-core");
const { prefix, token } = require('./config.json');

let rawData = fs.readFileSync('./editSnipes.json');
let editSnipes = JSON.parse(rawData);
let data = fs.readFileSync('./snipes.json');
let snipes = JSON.parse(data);


const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);

	// set a new item in the Collection
	// with the key as the command name and the value as the exported module
	client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

client.once('ready', () => {
	console.log('Ready!');
});

client.on('messageDelete', message => {
	if (message.author.bot) return;
	if (!message.guild) return;

	var snipe = new Object();
    var content = message.content;
    if (!content) content = 'None';

	snipe.author = message.author.tag;
	snipe.authorAvatar = message.author.displayAvatarURL({ format: "png", dynamic: true });
	snipe.content = message.content;
	snipe.timestamp = message.createdAt.toUTCString([8]);

	if (message.attachments.size > 0) {
		const channel = message.client.channels.cache.get('764846009221251122');
		var urlArray = [];
        message.attachments.each(attachment => {
            urlArray.push(attachment.proxyURL);
        });
        snipe.attachments = urlArray
        urlArray.forEach(url => {
			let embed = new Discord.MessageEmbed()
				.setColor('#ffff00')
				.setTitle(`**__Message Delete__**`)
				.addFields(
					{ name: '**User**', value: `${message.author.tag}`, inline: true },
					{ name: '**Channel**', value: `${message.channel}`, inline: true },
					{ name: '**Content**', value: `${content}` },
				)
				.setImage(url);
			channel.send(embed);
		});
		snipes.push(snipe);
        let data = JSON.stringify(snipes, null, 2);
        fs.writeFileSync(`./snipes.json`, data);
	} else {
		snipes.push(snipe);
		let data = JSON.stringify(snipes, null, 2);
        fs.writeFileSync(`./snipes.json`, data);
	};
});

client.on('messageUpdate', (oldMessage, newMessage) => {
	if (oldMessage.author.bot) return;
	if (!oldMessage.guild) return;

	var editSnipe = new Object();

	editSnipe.author = newMessage.author.tag;
	editSnipe.authorAvatar = newMessage.author.displayAvatarURL({ format: "png", dynamic: true});
	editSnipe.content = oldMessage.content;
	editSnipe.timestamp = newMessage.editedAt.toUTCString([8]);
	editSnipes.push(editSnipe);
	let data = JSON.stringify(editSnipes, null, 2);
	fs.writeFileSync(`./editSnipes.json`. data);
});

client.on('message', message => {
	if (message.author.bot || !message.content.startsWith(prefix)) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if (command.guildOnly && message.channel.type === 'dm') {
	    return message.reply('I can\'t execute that command inside DMs!');
    } 

    if (!cooldowns.has(command.name)) {
	    cooldowns.set(command.name, new Discord.Collection());
    };

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
    	const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

	    if (now < expirationTime) {
		    const timeLeft = (expirationTime - now) / 1000;
		    return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
	    };

	timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    };

	try {
		command.execute(message, args);
	} catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	};
	return;
});

client.login(token);
