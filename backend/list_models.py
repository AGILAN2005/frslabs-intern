
"""
Script to list all available Gemini models for your API key
Run this to see which models you can actually use
"""

import google.generativeai as genai
import os


API_KEY = os.getenv('GOOGLE_API_KEY', 'AIzaSyBmUqPT4TVKFzPZ3khT_-UOmNN4KxQkZh0')

genai.configure(api_key=API_KEY)

print("=" * 60)
print("CHECKING GOOGLE GENERATIVE AI LIBRARY")
print("=" * 60)
print(f"Library version: {genai.__version__}")

print("\n" + "=" * 60)
print("AVAILABLE GEMINI MODELS")
print("=" * 60)

try:
    
    models = list(genai.list_models())
    
    if not models:
        print("\nNo models found. This might indicate:")
        print("  1. Invalid API key")
        print("  2. API not enabled")
        print("  3. Network issue")
    
    generate_content_models = []
    
    for model in models:
        
        supported_methods = getattr(model, 'supported_generation_methods', [])
        if 'generateContent' in supported_methods:
            generate_content_models.append(model)
            print(f"\n✓ {model.name}")
            print(f"  Display Name: {getattr(model, 'display_name', 'N/A')}")
            print(f"  Description: {getattr(model, 'description', 'N/A')[:80]}...")
            
           
            input_limit = getattr(model, 'input_token_limit', 'N/A')
            output_limit = getattr(model, 'output_token_limit', 'N/A')
            print(f"  Input Token Limit: {input_limit}")
            print(f"  Output Token Limit: {output_limit}")
    
    print("\n" + "=" * 60)
    print(f"FOUND {len(generate_content_models)} MODELS SUPPORTING generateContent")
    print("=" * 60)
    
    if generate_content_models:
        print("\n📋 USE ONE OF THESE IN YOUR CODE:")
        for model in generate_content_models[:5]:
            model_id = model.name.replace('models/', '')
            print(f"  - '{model_id}'")
        
        print("\n💡 TRY THESE FIRST:")
        print("  genai.GenerativeModel('gemini-1.5-flash')")
        print("  genai.GenerativeModel('gemini-pro')")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    
    print("\n🔍 TROUBLESHOOTING:")
    print("  1. Check your API key at: https://aistudio.google.com/app/apikey")
    print("  2. Ensure Generative Language API is enabled")
    print(f"  3. Your library version: {genai.__version__}")
    print("  4. Update library: pip install --upgrade google-generativeai")

print("\n" + "=" * 60)
print("TESTING MODEL INITIALIZATION")
print("=" * 60)


test_models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro']

for model_name in test_models:
    try:
        test_model = genai.GenerativeModel(model_name)
        print(f"✓ Successfully initialized: {model_name}")
    except Exception as e:
        print(f"✗ Failed to initialize {model_name}: {str(e)[:80]}")

print("\n" + "=" * 60)