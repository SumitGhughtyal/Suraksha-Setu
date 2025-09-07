## 1. System Architecture Overview




## 1. High-Level System Architecture

```mermaid
graph TD
    subgraph "Frontend Layer (User Interfaces)"
        TouristApp[Tourist Mobile App<br/>React Native]
        AuthorityDashboard[Authority Web Dashboard<br/>React or Next.js]
        KioskPortal[Registration Kiosk<br/>Simple Web UI]
    end

    subgraph "API Gateway & Core Services"
        Gateway[API Gateway<br/>AWS Gateway or Kong]
        AuthService[Auth Service<br/>JWT  Role-Based Access]
        NotificationService[Notification Service<br/>AWS SNS, FCM, Twilio]
        LocationService[Location & Geo-Fence Service<br/>Node.js or Go]
        FIRService[E-FIR Generation Service<br/>PDF Generation Library]
    end

    subgraph "Blockchain Layer (Identity & Trust)"
        Fabric[Hyperledger Fabric Network<br/>Permissioned Ledger]
        Chaincode[Smart Contracts - Chaincode<br/>Go or Node.js]
        DigitalID[Digital Tourist ID<br/>Verifiable Credentials]
    end

    subgraph "Data & Storage Layer"
        Postgres[(PostgreSQL + PostGIS<br/>User & Geospatial Data)]
        Redis[(Redis<br/>Caching & Session Mgmt)]
        S3[(Object Storage - S3 or MinIO<br/>Logs & Generated FIRs)]
    end

    subgraph "AI/ML Anomaly Detection Engine"
        RouteModel[Route Deviation Model<br/>TensorFlow or PyTorch]
        InactivityModel[Inactivity Detection Model<br/>Scikit-learn]
        DropoffModel[Network Drop-off Model<br/>Statistical Analysis]
    end

    subgraph "External Services & Integrations"
        MappingAPI[Mapping & GIS APIs<br/>Mapbox or Bhuvan]
        GovtIDAPI[Govt ID Verification API<br/>Aadhaar or Passport Service]
        EmergencyAPI[Emergency Services<br/>Dial 112 System API]
    end

    %% --- Connections ---
    TouristApp --> Gateway
    AuthorityDashboard --> Gateway
    KioskPortal --> Gateway

    Gateway --> AuthService
    Gateway --> NotificationService
    Gateway --> LocationService
    Gateway --> FIRService

    AuthService --> Postgres
    FIRService --> Postgres
    FIRService --> S3

    %% Blockchain Interactions
    KioskPortal --> AuthService
    AuthService --> Chaincode
    Chaincode -- Writes/Reads --> Fabric
    Fabric -- Stores --> DigitalID
    AuthorityDashboard -- Verifies ID via --> Gateway

    %% Location & AI Flow
    LocationService -- Ingests Data --> Postgres
    LocationService -- Uses --> MappingAPI
    RouteModel -- Analyzes Data from --> Postgres
    InactivityModel -- Analyzes Data from --> Postgres
    DropoffModel -- Analyzes Data from --> Postgres
    RouteModel -- Triggers --> NotificationService
    InactivityModel -- Triggers --> NotificationService
    DropoffModel -- Triggers --> NotificationService

    %% External Service Connections
    KioskPortal -- KYC via --> GovtIDAPI
    NotificationService -- Connects to --> EmergencyAPI

```

## 2. Data Flow Pipeline

### 2. 1. Data Flow: Tourist Onboarding & Digital ID Generation

```mermaid
sequenceDiagram
    participant Kiosk as Registration Kiosk Portal
    participant GW as API Gateway
    participant Auth as Auth Service
    participant GovtAPI as Govt ID API (Aadhaar/Passport)
    participant Chaincode as Smart Contract
    participant Fabric as Blockchain Network

    Kiosk->>+GW: 1. POST /register (KYC Data, Itinerary)
    GW->>+Auth: 2. Process Registration Request
    Auth->>+GovtAPI: 3. VerifyIdentity(DocumentData)
    GovtAPI-->>-Auth: 4. Verification Success
    Auth->>+Chaincode: 5. Invoke: createTouristID(ID_Details)
    Chaincode->>+Fabric: 6. Submit Transaction for Validation
    Fabric-->>-Chaincode: 7. Transaction Committed to Ledger
    Chaincode-->>-Auth: 8. Return Success (Tx_ID)
    Auth-->>-GW: 9. Registration Complete, Return QR Code
    GW-->>-Kiosk: 10. Display QR Code for Tourist  
```
### 2. 2. Data Flow: SOS / Panic Button Incident Response
```mermaid
sequenceDiagram
    participant App as Tourist Mobile App
    participant GW as API Gateway
    participant Notify as Notification Service
    participant Dashboard as Authority Dashboard
    participant Contacts as Emergency Contacts (SMS)
    participant E_API as Emergency API (e.g., Dial 112)

    App->>+GW: 1. POST /sos (Live Location, ID, Timestamp)
    GW->>+Notify: 2. TriggerSOSAlert(AlertData)
    
    par
        Notify->>+Dashboard: 3a. PUSH Real-time Alert (WebSocket)
    and
        Notify->>+Contacts: 3b. SEND SMS Alert (via Twilio/SNS)
    and
        Notify->>+E_API: 3c. POST Emergency Signal
    end

    Dashboard-->>-Notify: Acknowledged
    Contacts-->>-Notify: Acknowledged
    E_API-->>-Notify: Acknowledged
    
    Notify-->>-GW: 4. Acknowledged
    GW-->>-App: 5. { "status": "SOS Signal Received" }
```
### 2. 3. Data Flow: Proactive AI Anomaly Detection
```mermaid
sequenceDiagram
    participant App as Tourist Mobile App
    participant GW as API Gateway
    participant Location as Location Service
    participant DB as PostgreSQL + PostGIS DB
    participant AI as AI Anomaly Engine
    participant Notify as Notification Service
    participant Dashboard as Authority Dashboard

    App->>+GW: 1. POST /update-location (Periodic BG Sync)
    GW->>+Location: 2. IngestLocationData
    Location->>+DB: 3. STORE Geo-coordinate, Timestamp
    
    loop Scheduled/Real-time Analysis
        AI->>+DB: 4. QUERY Recent Location Data for Tourists
        AI->>AI: 5. Process data via models (Route Deviation, Inactivity)
        alt Anomaly Score > Threshold
            AI->>+Notify: 6. TriggerAnomalyAlert(TouristID, Reason)
            Notify->>+Dashboard: 7. PUSH Low-Priority Alert for Investigation
            Dashboard-->>-Notify: Acknowledged
            Notify-->>-AI: Acknowledged
        end
    end
```

## 3. Smart Contract Architecture

```mermaid
graph TD
    subgraph "Digital Tourist ID Chaincode"
        A[Data Structures - State<br/>- TouristID Struct]
        B[Core Functions - Logic<br/>- createID<br/>- verifyID<br/>- expireID<br/>- revokeID]
        C[Access Control Logic<br/>- Registration Authority Role<br/>- Law Enforcement Role<br/>- Admin Role]
        D[Events<br/>- IDIssued<br/>- IDRevoked<br/>- IDExpired]
    end

    C -- Governs --> B
    B -- Manipulates --> A
    B -- Emits --> D

```

## 4. AI Processing Pipeline

```mermaid
graph TD
    A[Raw GPS Data Ingestion from Mobile App] --> B{Data Cleaning & Preprocessing};
    B --> C[Feature Engineering<br/>- Speed<br/>- Dwell Time<br/>- Location Context<br/>- Route Adherence];
    C --> D[Route Deviation Model];
    C --> E[Inactivity Model];
    C --> F[Network Drop-off Model];
    D --> G{Anomaly Score Aggregation};
    E --> G;
    F --> G;
    G -- If Score > Threshold --> H[Generate Contextual Anomaly Alert];
    H --> I[Push Alert to Authority Dashboard];

    
```

## 5. Implementation Pipeline & Phases

```mermaid
gantt
    title Smart Tourist Safety System - Implementation Roadmap
    dateFormat  YYYY-MM-DD
    axisFormat %b %Y
    
    section Phase 1: Foundation & Core MVP (4 Months)
    Core Backend & DB Setup      :active, crit, 2025-09-15, 60d
    Blockchain ID System Dev     :crit, after Core Backend & DB Setup, 45d
    Tourist Mobile App (SOS/Track):crit, 2025-10-01, 90d
    Authority Dashboard (Alerts) :2025-11-01, 75d

    section Phase 2: Intelligence Layer (5 Months)
    Data Collection & Cleaning   :2026-01-15, 30d
    AI Model Dev & Training      :crit, after Data Collection & Cleaning, 90d
    AI Engine Integration        :after AI Model Dev & Training, 45d
    Geo-Fencing & Heat Maps      :2026-03-15, 60d

    section Phase 3: Ecosystem Expansion (3 Months)
    Multilingual Support         :2026-06-15, 60d
    Automated E-FIR Generation   :after Multilingual Support, 45d
    Optional IoT Wearable Pilot  :2026-07-01, 75d

```

## 6. Data Structures & Database Schema

```mermaid
erDiagram
    TOURISTS ||--|{ ITINERARIES : "has"
    TOURISTS ||--o{ LOCATION_HISTORY : "logs"
    TOURISTS ||--o{ ALERTS : "can trigger"
    OFFICERS ||--o{ ALERTS : "can handle"

    TOURISTS {
        string tourist_id PK
        string digital_id_hash UK "Links to Blockchain ID"
        string name_encrypted
        string country_encrypted
        datetime created_at
    }
    ITINERARIES {
        string itinerary_id PK
        string tourist_id FK
        jsonb planned_route "GeoJSON format"
        date start_date
        date end_date
    }
    LOCATION_HISTORY {
        bigint location_id PK
        string tourist_id FK
        geography coordinates "PostGIS Point"
        datetime timestamp
        float speed_kmh
    }
    ALERTS {
        string alert_id PK
        string tourist_id FK
        string officer_id FK
        string alert_type "ENUM: SOS, AI_Inactivity, AI_Deviation"
        string status "ENUM: New, Investigating, Resolved"
        geography location "PostGIS Point"
        datetime timestamp
    }
    OFFICERS {
        string officer_id PK
        string name
        string badge_number
        string role "ENUM: Operator, Admin"
    }
    GEO_ZONES {
        string zone_id PK
        string zone_name
        string zone_type "ENUM: High-Risk, No-Network"
        geometry area_polygon "PostGIS Polygon"
    }
   
    
     
```

## 7. Security & Privacy Architecture

```mermaid
graph TD
    subgraph "Security & Privacy Architecture"
        A[<b>Data Protection Layer</b><br/>Encryption, Hashing, Anonymization]
        B[<b>Identity & Trust Layer</b><br/>Blockchain Immutability, Time-Bound IDs]
        C[<b>Access Control Layer</b><br/>Role-Based Access Control - RBAC, Immutable Audit Logs]
        D[<b>Infrastructure Security Layer</b><br/>Secure Cloud, Network Firewalls, Regular Audits]
    end

    A -- Secures Data At Rest & In Transit --> D
    B -- Guarantees Integrity Of --> A
    C -- Governs Who Can Access --> A
```

## 8. Technical Specifications

### Core Technologies Stack:

**Frontend:** React Native, Next.js (React)


**Backend:** Node.js, Go(Golang), Python(Flask/Django)


**Blockchain:** Hyperledger Fabric, Go or Node.js


**AI/ML:** Python, TensorFlow & PyTorch, Scikit-learn


**Infrastructure:** Cloud Platform (AWS, Azure, or NIC MeghRaj), Docker & Kubernetes, PostgreSQL with PostGIS, Redis


## **9. Key Features & Capabilities**

### **Advanced AI Features:** 🧠

* **Predictive Risk Assessment:** The system's AI doesn't just react; it proactively predicts risk by analyzing travel patterns against declared itineraries, location context, and normal tourist behavior. It can flag a tourist who is potentially in danger *before* they press the panic button.
* **Dynamic Safety Heat Maps:** The dashboard features a live map that shows real-time tourist clusters and dynamically updates "hot zones" based on incoming alerts, historical crime data, and AI-detected anomalies, allowing authorities to allocate resources more effectively.
* **Context-Aware Anomaly Detection:** The AI understands context. It can differentiate between a tourist stopping for two hours at a popular museum (normal behavior) and a tourist stopping for two hours on a remote, unlit highway at night (a high-risk anomaly), which significantly reduces false alarms.

---

### **Decentralized Benefits:** ⛓️

* **Tamper-Proof Digital Identity:** The core of the system's trust. The blockchain ensures that a tourist's Digital ID is **immutable**—it cannot be forged, altered, or deleted by anyone. This provides a single, verifiable source of truth for all law enforcement and government agencies.
* **Privacy by Design via Time-Bound IDs:** A critical privacy feature where the Digital ID automatically expires the moment the tourist's trip is over. This ensures their data isn't stored indefinitely and aligns with data protection principles like purpose limitation.
* **Inter-Agency Trust and Auditability:** Using a permissioned blockchain like **Hyperledger Fabric** allows different government bodies (e.g., Ministry of Tourism, State Police Departments) to operate on the same trusted ledger, ensuring seamless and auditable collaboration.

---

### **Scalability Features:** ⚙️

* **Microservices Architecture:** The system is built from independent services (Location, Notification, Auth). This means the location-tracking service can be scaled up during peak tourist season without affecting the rest of the system's performance.
* **Cloud-Native Deployment:** Using **Docker** and **Kubernetes**, the system can automatically scale its resources up or down based on demand. This is both cost-effective and ensures the system remains responsive even with hundreds of thousands of active users.
* **Asynchronous Processing:** Heavy computational tasks, like running AI analysis across thousands of data points, are handled in the background. This ensures that the critical user-facing elements, like the SOS button and the real-time alert dashboard, are always instantly responsive.

---

## **10. Success Metrics & KPIs**

### **User Engagement & Impact:** 📈

* **App Adoption Rate:** The percentage of tourists in a given region who successfully register and activate the app. This is the primary indicator of public trust and perceived value.
* **Incident Response Time Reduction:** The average time measured from an SOS alert being triggered to the first response arriving on the scene. The goal is a quantifiable reduction compared to pre-system benchmarks.
* **Successful AI-driven Interventions:** The number of verified incidents where an AI-generated anomaly alert (not an SOS) led to a successful intervention, directly proving the proactive capabilities of the system.

---

### **Technical Performance:** 📊

* **Alert Latency:** The end-to-end time from a tourist pressing the SOS button to the alert appearing on the authority dashboard. **Target: < 2 seconds.**
* **AI Model Accuracy:** The precision and recall rates of the anomaly detection engine, continuously measured to minimize false positives (unnecessary alerts) and eliminate false negatives (missed incidents).
* **System Uptime:** The percentage of time all critical system components are fully operational and available. **Target: > 99.95%.**
