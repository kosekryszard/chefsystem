**\# Chefsystent \- Brand Guide**

**\#\# 🎨 Paleta kolorów**

**\#\#\# Kolory podstawowe (branding)**  
**| Nazwa | HEX | RGB | Zastosowanie |**  
**|-------|-----|-----|--------------|**  
**| \*\*Ciemny granat\*\* | \`\#0A1F44\` | (10, 31, 68\) | Tło główne, header, elementy ciemne |**  
**| \*\*Złoty\*\* | \`\#D4AF37\` | (212, 175, 55\) | Akcenty, przyciski primary, hover |**

**\#\#\# Kolory UI (system)**  
**| Nazwa | HEX | RGB | Zastosowanie |**  
**|-------|-----|-----|--------------|**  
**| \*\*Granat jasny\*\* | \`\#1a3a6b\` | (26, 58, 107\) | Gradient (od), karty hover |**  
**| \*\*Złoty ciemny\*\* | \`\#B8941F\` | (184, 148, 31\) | Hover na przyciskach złotych |**  
**| \*\*Biały\*\* | \`\#FFFFFF\` | (255, 255, 255\) | Tło kart, modali, teksty na ciemnym |**  
**| \*\*Szary jasny\*\* | \`\#F8F9FA\` | (248, 249, 250\) | Tło sekcji, inputy |**  
**| \*\*Szary\*\* | \`\#E0E0E0\` | (224, 224, 224\) | Obramowania |**  
**| \*\*Szary ciemny\*\* | \`\#666666\` | (102, 102, 102\) | Tekst pomocniczy |**

**\#\#\# Kolory akcji**  
**| Nazwa | HEX | RGB | Zastosowanie |**  
**|-------|-----|-----|--------------|**  
**| \*\*Sukces\*\* | \`\#28A745\` | (40, 167, 69\) | Przyciski zapisz, powiadomienia sukces |**  
**| \*\*Danger\*\* | \`\#DC3545\` | (220, 53, 69\) | Przyciski usuń, alerty błędy |**  
**| \*\*Info\*\* | \`\#17A2B8\` | (23, 162, 184\) | Powiadomienia info |**  
**| \*\*Warning\*\* | \`\#FFC107\` | (255, 193, 7\) | Ostrzeżenia |**

**\#\#\# Kolory specjalne (dieta)**  
**| Nazwa | HEX | RGB | Zastosowanie |**  
**|-------|-----|-----|--------------|**  
**| \*\*Vegan zielony\*\* | \`\#388E3C\` | (56, 142, 60\) | Badge wegański |**  
**| \*\*Vege zielony jasny\*\* | \`\#66BB6A\` | (102, 187, 106\) | Badge wegetariański |**

**\#\# 🎨 Gradienty**

**\#\#\# Gradient główny (header, tło)**  
**\`\`\`css**  
**background: linear-gradient(135deg, \#0A1F44 0%, \#1a3a6b 100%);**  
**\`\`\`**

**\#\#\# Gradient złoty (akcenty, przyciski hover)**  
**\`\`\`css**  
**background: linear-gradient(135deg, \#D4AF37 0%, \#B8941F 100%);**  
**\`\`\`**

**\#\# 📐 Layout Standards**

**\#\#\# Struktura strony**  
**\`\`\`**  
**Header (gradient granat)**  
  **├─ Logo/Tytuł (biały \+ złoty akcent)**  
  **├─ Nawigacja (białe linki, hover złoty)**  
    
**Content (białe tło)**  
  **├─ Tytuł sekcji (granat)**  
  **├─ Grid kart (białe karty, border szary, hover złoty)**  
  **└─ Przyciski akcji (złote primary)**

**Footer (opcjonalnie \- granat)**  
**\`\`\`**

**\#\#\# Nawigacja**  
**\`\`\`html**  
**\<div class="nav"\>**  
    **\<a href="index.html"\>Surowce\</a\>**  
    **\<a href="recipes.html"\>Receptury\</a\>**  
    **\<a href="dishes.html"\>Dania\</a\>**  
**\</div\>**  
**\`\`\`**

**Styl:**  
**\- Tło: \`rgba(255,255,255,0.1)\` (przezroczysty biały)**  
**\- Hover: \`\#D4AF37\` (złoty)**  
**\- Border-radius: \`20px\`**

**\#\#\# Karty (grid layout)**  
**\`\`\`css**  
**.card {**  
    **background: white;**  
    **border: 2px solid \#E0E0E0;**  
    **border-radius: 12px;**  
    **padding: 20px;**  
    **transition: all 0.3s;**  
**}**

**.card:hover {**  
    **border-color: \#D4AF37;**  
    **box-shadow: 0 5px 15px rgba(212, 175, 55, 0.2);**  
    **transform: translateY(-3px);**  
**}**  
**\`\`\`**

**\#\#\# Przyciski**  
**\`\`\`css**  
**/\* Primary \- złoty \*/**  
**.btn-primary {**  
    **background: \#D4AF37;**  
    **color: \#0A1F44;**  
    **font-weight: 600;**  
**}**  
**.btn-primary:hover {**  
    **background: \#B8941F;**  
**}**

**/\* Success \- zielony \*/**  
**.btn-success {**  
    **background: \#28A745;**  
    **color: white;**  
**}**

**/\* Danger \- czerwony \*/**  
**.btn-danger {**  
    **background: \#DC3545;**  
    **color: white;**  
**}**  
**\`\`\`**

**\#\#\# Badge/Tagi**  
**\- Typ dania: \`background: \#E3F2FD; color: \#1976D2;\`**  
**\- Cena: \`background: \#FFF3E0; color: \#E65100;\`**  
**\- Vegan: \`background: \#E8F5E9; color: \#388E3C;\`**

**\#\# 🔤 Typografia**

**\#\#\# Czcionka**  
**\`\`\`css**  
**font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;**  
**\`\`\`**

**\#\#\# Rozmiary**  
**\- H1 (header): \`2.5em\` \- biały**  
**\- H2 (tytuły sekcji): \`1.8em\` \- granat \`\#0A1F44\`**  
**\- H3 (podtytuły): \`1.3em\` \- granat**  
**\- Body: \`16px\` \- \`\#333333\`**  
**\- Small: \`14px\` \- \`\#666666\`**

**\#\# 📱 Responsywność**

**\- Mobile: \`\< 768px\`**  
**\- Tablet: \`768px \- 1024px\`**  
**\- Desktop: \`\> 1024px\`**

**Grid: \`grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));\`**

**\#\# ✨ Animacje**

**\- Transitions: \`0.3s ease\`**  
**\- Hover transform: \`translateY(-2px)\` lub \`translateY(-3px)\`**  
**\- Shadow on hover: \`0 5px 15px rgba(212, 175, 55, 0.2)\`**

**\---**

**\*\*Ostatnia aktualizacja:\*\* 2025-01-18**    
**\*\*Wersja:\*\* 1.0**

