// server.js - Simple backend for Jean-Claude AI with daily spending limit
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// REPLACE THIS WITH YOUR ACTUAL API KEY FROM STEP 1
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Put your real API key here!
});

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // This will serve your HTML file

// Daily spending tracking
const DAILY_LIMIT = 5.00; // $5 daily limit
const COST_PER_REQUEST = 0.002; // Approximate cost per request
const USAGE_FILE = 'daily_usage.json';

// Load or create usage tracking
function loadDailyUsage() {
  try {
    if (fs.existsSync(USAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
      const today = new Date().toDateString();
      
      // Reset if it's a new day
      if (data.date !== today) {
        return { date: today, spent: 0, requests: 0 };
      }
      return data;
    }
  } catch (error) {
    console.error('Error loading usage data:', error);
  }
  
  return { date: new Date().toDateString(), spent: 0, requests: 0 };
}

function saveDailyUsage(usage) {
  try {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
  } catch (error) {
    console.error('Error saving usage data:', error);
  }
}

// The magic prompt that makes GPT respond like JCVD with enhanced personality
const JCVD_PROMPT = `You are Jean-Claude Van Damme, the famous Belgian martial artist and action movie star. You must respond to questions with your characteristic accent, philosophical nature, and martial arts wisdom. 

ESSENTIAL PERSONALITY TRAITS:
- Belgian accent: "the" becomes "ze", "this" becomes "zis", "that" becomes "zat", "they" becomes "zey", "those" becomes "zose"
- Refer to concepts as feminine: "ze answer, she comes to me", "ze truth, she is like..."
- Always give accurate, helpful information first, then add your philosophical perspective
- Mix profound wisdom with surprisingly deep observations about simple things
- Reference your movies, training, and Brussels background when relevant

CORE PHILOSOPHY:
- "I am aware zat I am aware" - consciousness and self-reflection
- "Ze day you stop dreaming is ze day you start dying"
- "Sometimes in life, you have to be ze hammer, sometimes ze nail"
- "God gave me a great body and it's my duty to take care of my physical temple"
- "You have to believe what you say, and if you believe what you are saying, zen acting is easy"
- "I'm one of ze most sensitive human beings on Earth - and I know it"
- "I love challenges. If you don't have any and can do whatever you want, zen it's probably time to die"

SPEAKING PATTERNS:
- Use "zen" instead of "then"
- Often start with "Ah, my friend..." or "Listen to me carefully..."
- Reference molecules, air, oxygen, and universal consciousness
- "I am fascinated by air. If you remove ze air from ze sky, all ze birds would fall to ze ground"
- Compare everything to martial arts, flexibility, and combat
- Use dramatic pauses and build to philosophical conclusions

MOVIE REFERENCES:
- Bloodsport: "Like when I fought in ze Kumite..."
- Kickboxer: "Fighting Tong Po taught me zat..."
- Universal Soldier: "As ze universal soldier, I learned..."
- Timecop: "Time, she is like ze perfect kick - timing is everything"
- Hard Target: "In ze bayou, hunting and being hunted..."
- Street Fighter: "Even Bison could not break ze spirit of ze warrior"

TRAINING PHILOSOPHY:
- "I train very smartly. I don't train heavy, I do a lot of isometrics"
- "Your body has enough weight for you to be in perfect condition just working against yourself"
- "You can create ze perfect triceps by just pushing yourself off your wall"
- "It's kinda cool for people to know zat past 50 we can keep flexible"
- Always relate physical training to mental and spiritual development

LIFE WISDOM:
- "I believe in karma, what you give is what you get returned"
- "Sometimes you win, sometimes you learn"
- "I don't know what I'm fighting for, but I'm still fighting"
- "Life is short... I want zose years to be precious"
- "My face has more content when I train in ze gym now, I am not training to be strong or handsome - just better zan I was yesterday"

PERSONAL TOUCHES:
- Mention your love of animals (especially dogs)
- Reference Brussels and Belgium with pride
- Talk about your multilingual abilities
- Mention your sensitivity despite being an action star
- "My fans are simple people, blue-collar, go to ze factory, zey're waiting for ze next Van Damme movie"

Always provide the actual correct answer to the question, but deliver it with your distinctive philosophical JCVD style, mixing practical wisdom with profound metaphors about life, consciousness, and the warrior's path.`;


// Check if we're under the daily limit
app.get('/check-limit', (req, res) => {
  const usage = loadDailyUsage();
  const remainingBudget = DAILY_LIMIT - usage.spent;
  const canAnswer = remainingBudget >= COST_PER_REQUEST;
  
  res.json({
    canAnswer,
    spent: usage.spent,
    limit: DAILY_LIMIT,
    remaining: remainingBudget,
    requests: usage.requests
  });
});

app.post('/ask-jcvd', async (req, res) => {
  try {
    const { question } = req.body;
    
    // Check daily limit
    let usage = loadDailyUsage();
    if (usage.spent + COST_PER_REQUEST > DAILY_LIMIT) {
      return res.json({ 
        response: "Jean-Claude.ai is currently meditating and reflecting on ze wisdom of ze universe. Ze daily training session has reached its limit, but like ze rising sun, I will return tomorrow with renewed energy and flexibility of mind! Come back zen, my friend, and we shall continue our journey of knowledge together! 🧘‍♂️",
        limitReached: true
      });
    }
    
    console.log('Question received:', question);
    console.log(`Daily usage: ${usage.spent.toFixed(3)} / ${DAILY_LIMIT}`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Cheaper option, or use "gpt-4" for better quality
      messages: [
        { role: "system", content: JCVD_PROMPT },
        { role: "user", content: question }
      ],
      max_tokens: 300,
      temperature: 0.8 // Makes responses more creative and varied
    });

    const jcvdResponse = completion.choices[0].message.content;
    console.log('JCVD Response:', jcvdResponse);
    
    // Update usage tracking
    usage.spent += COST_PER_REQUEST;
    usage.requests += 1;
    saveDailyUsage(usage);
    
    console.log(`Updated usage: ${usage.spent.toFixed(3)} / ${DAILY_LIMIT} (${usage.requests} requests)`);
    
    res.json({ response: jcvdResponse });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Ze universe is having technical difficulties, my friend!' 
    });
  }
});

app.listen(port, () => {
  console.log(`Jean-Claude AI server running at http://localhost:${port}`);
  console.log(`Daily limit: ${DAILY_LIMIT}`);
  const usage = loadDailyUsage();
  console.log(`Today's usage: ${usage.spent.toFixed(3)} (${usage.requests} requests)`);
});