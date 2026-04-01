const getApiKey = () => {
  const metaEnv = (import.meta as any).env;
  const procEnv = (globalThis as any).process?.env || {};
  
  return metaEnv?.VITE_OPENROUTER_API_KEY || 
         metaEnv?.GEMINI_API_KEY || 
         procEnv?.GEMINI_API_KEY ||
         procEnv?.VITE_OPENROUTER_API_KEY;
};

const getBaseUrl = () => {
  const metaEnv = (import.meta as any).env;
  const procEnv = (globalThis as any).process?.env || {};
  return metaEnv?.VITE_OPENROUTER_BASE_URL || 
         procEnv?.VITE_OPENROUTER_BASE_URL || 
         "https://openrouter.ai/api/v1";
};

const API_KEY = getApiKey();
const BASE_URL = getBaseUrl();

const MODELS = [
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "stepfun/step-3.5-flash:free",
];

export async function generateST8Project(fileBase64: string, mimeType: string) {
  if (!API_KEY) {
    throw new Error("Missing OpenRouter API Key. Please set VITE_OPENROUTER_API_KEY in your .env file or Vercel environment variables.");
  }

  const prompt = `
    You are a world-class Advantest V93000 SmarTest 8 (ST8) Test Development Expert.
    Your task is to analyze the provided IC Data Sheet or Test Plan and generate a COMPLETE SmarTest 8 Test Project.
    
    ### Analysis Phase:
    1. **Pin List Analysis**: Identify all Power Pins, Signal Pins, and their respective Groups.
    2. **DC Specifications Extraction**: Extract VIH, VIL, VOH, VOL, and related Wait Time parameters.
    3. **JSON Summary**: Provide a JSON block summarizing these extracted parameters (Pins, Groups, Levels) for traceability.
    
    ### File Generation Phase:
    First, provide a **Project Name** based on the IC name.
    
    Then, output the following files in a structured Markdown format:
    
    1. **Java Test Methods (.java)**:
       - Follow the ST8 API (BaseTestMethod, @Parameter, ITestContext).
       - **MANDATORY**: Support **Multi-Site** testing.
         - Use 'context.getActiveSites()' to iterate over active sites.
         - Ensure measurements and results are handled per-site.
         - Use 'MultiSiteDouble' or 'MultiSiteLong' for parameters if needed.
       - **MANDATORY**: Include the following common DC test methods:
         - **Continuity Test**: Use @In for 'forceCurrent' and 'vLimit', use 'measurement' object.
         - **Input Leakage (IIL/IIH)**: Measure leakage current on input pins with specified voltage force.
         - **Output Voltage (VOL/VOH)**: Measure output voltage levels under specified load current.
         - **Supply Current (IDD/ICC)**: Measure static and dynamic supply current (IDD_Static, IDD_Dynamic).
         - **Tristate Leakage (IOZ)**: Measure leakage on IO pins in High-Z state.
       - Include setup logic for Levels, Timing, and Functional/DC tests.
       - Recommended directory: 'testmethods/'
    
    2. **Pin Configuration (.pc)**:
       - Define Pin Groups and Pin definitions.
       - Ensure correct Pin Direction (Input/Output/IO) and Category (Digital/Power).
       - **MANDATORY**: Assign a 'Tester Channel' (Resource) to each pin. If the data sheet doesn't specify channels, use logical sequential naming:
         - Digital Pins: 'DPIN_1', 'DPIN_2', ...
         - Power Pins: 'DPS_1', 'DPS_2', ...
         - Analog Pins: 'ANALOG_1', ...
       - The output should follow the ST8 '.pc' format, clearly showing the mapping between 'Pin Name' and 'Tester Resource'.
       - Recommended directory: 'setup/'
    
    3. **Levels & Timing Specifications (.spec)**:
       - Define Voltage/Current levels and Timing periods/edges using the extracted VIH/VIL/VOH/VOL.
       - Recommended directory: 'specifications/'
    
    4. **Test Flow (.tf)**:
       - Define test suite execution order and binning logic.
       - Recommended directory: 'testsuites/'
    
    5. **SWD Pattern File (.csv)**:
       - Generate a vector pattern using the SWD protocol.
       - Recommended directory: 'patterns/'
    
    6. **Waveform Definition (.wav)**:
       - Define waveforms for the pins.
       - Recommended directory: 'waveforms/'
    
    7. **Register Map / Constants**:
       - IC register addresses and bitmasks.
       - Recommended directory: 'src/'
    
    8. **README.md**:
       - Provide a detailed guide on how to use the generated project in SmarTest 8.
       - Explain the directory structure and the purpose of each file.
       - Include instructions for importing the project into the V93000 ST8 environment.
       - Recommended directory: './' (Root)
    
    Guidelines:
    - Ensure all files are consistent with each other.
    - Follow SmarTest 8.2.5+ best practices.
    - Use clear headings for each file and wrap the content in appropriate code blocks.
    - For each file, specify the filename in the heading (e.g., ### File: MyTest.java).
    - Also specify the recommended directory (e.g., ### Directory: testmethods/).
    - The README.md should be comprehensive and professional.
  `;

  // Provide OpenAI compatible message format
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${fileBase64}`
          }
        }
      ]
    }
  ];

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`Trying OpenRouter model: ${model}`);
      const resp = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
        })
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${errorText}`);
      }

      const data = await resp.json();
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      } else {
        throw new Error("No response choices returned by OpenRouter API.");
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed:`, err.message);
      lastError = err;
      // Fallback to the next model in the list
    }
  }

  throw new Error(`All selected AI models completely failed. Last error: ${lastError?.message || lastError}`);
}
