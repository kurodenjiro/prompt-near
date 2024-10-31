import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const model = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0.1,
  apiKey: OPENAI_API_KEY
});


  export async function contractTool({ sourceCode, account, methods }: any) {
    console.log(methods)
    const messages = [
      new SystemMessage(`You are a rust developer. 
              When the user gives the source code and method. Provide your response as a JSON object with the following schema: , 
           returns [{ account:  ${account}, method: ${methods}  , description : description with method 100 words limit , params : { type : data types ,description }} `),
      new HumanMessage(`Your response will not be in Markdown format, only JSON.Here is the source code : ${sourceCode} , method : ${methods}  `),
    ];
    const parser = new StringOutputParser();
    const result = await model.invoke(messages);
  
    const resultParse = await parser.invoke(result);
    console.log(resultParse);
    return resultParse
  
  }