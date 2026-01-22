const axios = require('axios');

class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseURL = 'https://openrouter.ai/api/v1';
    }

    async generateResponse(message, courseInfo) {
        try {
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: "mistralai/mistral-7b-instruct:free",
                    messages: [
                        {
                            role: "system",
                            content: `Você é um assistente de vendas especializado em cursos universitários.
                            Informações do curso: ${JSON.stringify(courseInfo)}
                            Responda em português brasileiro de forma clara e profissional.
                            Use formatação markdown para melhor leitura.`
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
                        'X-Title': 'Assistance SM'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Erro OpenRouter:', error.response?.data || error.message);
            throw new Error('Erro ao gerar resposta da IA');
        }
    }
}

module.exports = new OpenRouterService();
