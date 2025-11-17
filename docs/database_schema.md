# **ChefSystem \- Database Schema v1.0**

**Data: 17.11.2025**  
 **Baza: PostgreSQL**  
 **Status: Wersja robocza \- zatwierdzona**

---

## **1\. TABELA: ingredients (surowce)**

**Główna tabela zasobów \- podstawa całego systemu.**

**CREATE TABLE ingredients (**  
  **id SERIAL PRIMARY KEY,**  
  **nazwa VARCHAR(200) NOT NULL UNIQUE,**  
  **jm\_podstawowa VARCHAR(20) NOT NULL,**  
  **typ VARCHAR(50),**  
  **grupa VARCHAR(100),**  
  **dział VARCHAR(50),**  
  **wegetarianski BOOLEAN DEFAULT false,**  
  **weganski BOOLEAN DEFAULT false,**  
  **alergeny INTEGER\[\],**  
  **created\_at TIMESTAMP DEFAULT NOW(),**  
  **updated\_at TIMESTAMP DEFAULT NOW()**  
**);**

**CREATE INDEX idx\_ingredients\_typ ON ingredients(typ);**  
**CREATE INDEX idx\_ingredients\_nazwa ON ingredients(nazwa);**

**Pola:**

* **`nazwa` \- "pomidor", "kurczak pierś", "sól himalajska"**  
* **`jm_podstawowa` \- z tabeli `units`**  
* **`typ` \- warzywo/owoc/mięso/wędlina/nabiał/przyprawa/zioło\_świeże/inne**  
* **`grupa` \- opcjonalne, szczegółowa kategoryzacja**  
* **`dział` \- kuchnia/bar/ogólne**  
* **`alergeny` \- tablica \[1,3,7\] \= gluten, jaja, mleko**

---

## **2\. TABELA: units (jednostki miary)**

**Stała lista \+ możliwość dodawania przez admina.**

**CREATE TABLE units (**  
  **id SERIAL PRIMARY KEY,**  
  **kod VARCHAR(10) NOT NULL UNIQUE,**  
  **nazwa\_pl VARCHAR(50) NOT NULL,**  
  **typ VARCHAR(20) NOT NULL,**  
  **aktywna BOOLEAN DEFAULT true,**  
  **kolejnosc INTEGER DEFAULT 999,**  
  **created\_at TIMESTAMP DEFAULT NOW()**  
**);**

**\-- Dane początkowe**  
**INSERT INTO units (kod, nazwa\_pl, typ, kolejnosc) VALUES**  
  **('kg', 'kilogram', 'waga', 1),**  
  **('g', 'gram', 'waga', 2),**  
  **('l', 'litr', 'objętość', 3),**  
  **('ml', 'mililitr', 'objętość', 4),**  
  **('szt', 'sztuka', 'inne', 5),**  
  **('op', 'opakowanie', 'inne', 6),**  
  **('zgrzewka', 'zgrzewka', 'inne', 7),**  
  **('karton', 'karton', 'inne', 8);**

---

## **3\. TABELA: allergens (alergeny)**

**Stała lista 12 podstawowych \+ możliwość edycji przez admina.**

**CREATE TABLE allergens (**  
  **id INTEGER PRIMARY KEY,**  
  **nazwa\_pl VARCHAR(100) NOT NULL,**  
  **kod VARCHAR(20),**  
  **aktywny BOOLEAN DEFAULT true,**  
  **kolejnosc INTEGER NOT NULL**  
**);**

**INSERT INTO allergens (id, nazwa\_pl, kod, kolejnosc) VALUES**  
  **(1, 'Gluten', 'GLU', 1),**  
  **(2, 'Skorupiaki', 'CRU', 2),**  
  **(3, 'Jaja', 'EGG', 3),**  
  **(4, 'Ryby', 'FISH', 4),**  
  **(5, 'Orzeszki ziemne', 'PEA', 5),**  
  **(6, 'Soja', 'SOY', 6),**  
  **(7, 'Mleko', 'MILK', 7),**  
  **(8, 'Orzechy', 'NUTS', 8),**  
  **(9, 'Seler', 'CEL', 9),**  
  **(10, 'Gorczyca', 'MUS', 10),**  
  **(11, 'Sezam', 'SES', 11),**  
  **(12, 'Dwutlenek siarki', 'SUL', 12);**

---

## **4\. TABELA: recipes (receptury)**

**Proste przepisy składające się z surowców.**

**CREATE TABLE recipes (**  
  **id SERIAL PRIMARY KEY,**  
  **nazwa VARCHAR(200) NOT NULL,**  
  **typ VARCHAR(50) DEFAULT 'polprodukt',**  
  **wydajnosc\_ilosc DECIMAL(10,3),**  
  **wydajnosc\_jm VARCHAR(20),**  
  **opis TEXT,**  
  **wegetarianski BOOLEAN DEFAULT false,**  
  **weganski BOOLEAN DEFAULT false,**  
  **alergeny INTEGER\[\],**  
  **created\_at TIMESTAMP DEFAULT NOW(),**  
  **updated\_at TIMESTAMP DEFAULT NOW()**  
**);**

**CREATE INDEX idx\_recipes\_typ ON recipes(typ);**

**Typy receptur: polprodukt / danie\_proste / dodatek / sos / deser**

---

## **5\. TABELA: recipe\_ingredients (składniki receptur)**

**Relacja many-to-many: receptura ↔ surowce.**

**CREATE TABLE recipe\_ingredients (**  
  **id SERIAL PRIMARY KEY,**  
  **recipe\_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,**  
  **ingredient\_id INTEGER NOT NULL REFERENCES ingredients(id),**  
  **ilosc DECIMAL(10,3) NOT NULL,**  
  **jm VARCHAR(20) NOT NULL,**  
  **kolejnosc INTEGER DEFAULT 0,**  
  **UNIQUE(recipe\_id, ingredient\_id)**  
**);**

**CREATE INDEX idx\_recipe\_ing\_recipe ON recipe\_ingredients(recipe\_id);**  
**CREATE INDEX idx\_recipe\_ing\_ingredient ON recipe\_ingredients(ingredient\_id);**

---

## **6\. TABELA: dishes (dania złożone)**

**Kompletne produkty gotowe do sprzedaży.**

**CREATE TABLE dishes (**  
  **id SERIAL PRIMARY KEY,**  
  **nazwa VARCHAR(200) NOT NULL,**  
  **nazwa\_karta VARCHAR(200),**  
  **opis\_karta TEXT,**  
  **cena\_sugerowana DECIMAL(10,2),**  
  **wegetarianski BOOLEAN DEFAULT false,**  
  **weganski BOOLEAN DEFAULT false,**  
  **alergeny INTEGER\[\],**  
  **aktywne BOOLEAN DEFAULT true,**  
  **created\_at TIMESTAMP DEFAULT NOW(),**  
  **updated\_at TIMESTAMP DEFAULT NOW()**  
**);**

---

## **7\. TABELA: dish\_components (składniki dania)**

**Relacja: danie → receptury \+ surowce.**

**CREATE TABLE dish\_components (**  
  **id SERIAL PRIMARY KEY,**  
  **dish\_id INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,**  
  **typ VARCHAR(20) NOT NULL CHECK (typ IN ('receptura', 'surowiec')),**  
  **recipe\_id INTEGER REFERENCES recipes(id),**  
  **ingredient\_id INTEGER REFERENCES ingredients(id),**  
  **ilosc DECIMAL(10,3) NOT NULL,**  
  **jm VARCHAR(20) NOT NULL,**  
  **kategoria VARCHAR(50) DEFAULT 'glowne',**  
  **kolejnosc INTEGER DEFAULT 0,**  
  **CHECK (**  
    **(typ \= 'receptura' AND recipe\_id IS NOT NULL AND ingredient\_id IS NULL) OR**  
    **(typ \= 'surowiec' AND ingredient\_id IS NOT NULL AND recipe\_id IS NULL)**  
  **)**  
**);**

**CREATE INDEX idx\_dish\_comp\_dish ON dish\_components(dish\_id);**

**Kategorie: glowne / dodatek / surówka / sos / dekoracja**

---

## **8\. TABELA: locations (lokale)**

**CREATE TABLE locations (**  
  **id SERIAL PRIMARY KEY,**  
  **nazwa VARCHAR(100) NOT NULL UNIQUE,**  
  **typ VARCHAR(50) DEFAULT 'kuchnia',**  
  **aktywny BOOLEAN DEFAULT true,**  
  **created\_at TIMESTAMP DEFAULT NOW()**  
**);**

**INSERT INTO locations (nazwa, typ) VALUES**  
  **('Pasterka', 'kuchnia'),**  
  **('Szczelinka', 'kuchnia'),**  
  **('Stolove', 'kuchnia');**

---

## **9\. TABELA: users (użytkownicy)**

**CREATE TABLE users (**  
  **id SERIAL PRIMARY KEY,**  
  **email VARCHAR(255) NOT NULL UNIQUE,**  
  **haslo\_hash VARCHAR(255) NOT NULL,**  
  **imie VARCHAR(100),**  
  **nazwisko VARCHAR(100),**  
  **rola VARCHAR(50) DEFAULT 'kucharz',**  
  **location\_id INTEGER REFERENCES locations(id),**  
  **aktywny BOOLEAN DEFAULT true,**  
  **created\_at TIMESTAMP DEFAULT NOW(),**  
  **last\_login TIMESTAMP**  
**);**

**CREATE INDEX idx\_users\_email ON users(email);**

**Role: admin / szef\_kuchni / kucharz / pracownik**

---

## **10\. TABELA: system\_logs (logi zmian)**

**Dla kontroli zmian przez admina (alergeny, jednostki).**

**CREATE TABLE system\_logs (**  
  **id SERIAL PRIMARY KEY,**  
  **user\_id INTEGER REFERENCES users(id),**  
  **typ VARCHAR(50) NOT NULL,**  
  **opis TEXT,**  
  **created\_at TIMESTAMP DEFAULT NOW()**  
**);**

---

## **PRIORYTETY IMPLEMENTACJI:**

### **Faza 1 (TERAZ):**

1. **✅ ingredients**  
2. **✅ units**  
3. **✅ allergens**  
4. **✅ users (podstawowe)**  
5. **✅ locations**

### **Faza 2 (później):**

6. **recipes \+ recipe\_ingredients**  
7. **dishes \+ dish\_components**

### **Faza 3 (przyszłość):**

* **Dostawcy**  
* **Zamówienia**  
* **Menu/jadłospisy**  
* **Checklisty zakupowe**

---

## **NOTATKI TECHNICZNE:**

* **Alergeny jako array: Szybkie zapytania, łatwe dodawanie**  
* **Soft deletes: Zamiast usuwać \- `aktywny = false`**  
* **Timestampy: Wszystkie tabele mają `created_at`, ważne `updated_at`**  
* **Indeksy: Na często wyszukiwanych polach (nazwa, typ, FK)**  
* **Constraints: CHECK dla poprawności danych (typ in dish\_components)**

---

**Następny krok: Setup PostgreSQL \+ pierwsze API**

