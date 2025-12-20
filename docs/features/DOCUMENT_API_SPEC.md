# Document Processing API Specification

## Base URL
```
/api/documents
```

## Endpoints

### 1. Upload Document
```
POST /api/documents/upload
```

**Request:**
- Content-Type: multipart/form-data
- Body:
  - file: File (required)
  - type: DocumentType (optional)
  - residentId: string (optional)
  - inquiryId: string (optional)
  - tags: string[] (optional)
  - notes: string (optional)

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "doc_123",
    "fileName": "insurance_card.pdf",
    "fileUrl": "https://i.ytimg.com/vi/ZfO97jBWvOg/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCF6BhnmxowFZlhfC9eldXSzUx-Sg",
    "type": "INSURANCE_CARD",
    "extractionStatus": "PENDING",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2. Extract Text (OCR)
```
POST /api/documents/[id]/extract
```

**Response:**
```json
{
  "success": true,
  "extractedText": "Full text content...",
  "extractionStatus": "COMPLETED"
}
```

### 3. Extract Fields (AI)
```
POST /api/documents/[id]/extract-fields
```

**Response:**
```json
{
  "success": true,
  "extractedData": {
    "firstName": { "value": "John", "confidence": 0.95 },
    "lastName": { "value": "Doe", "confidence": 0.98 },
    "dateOfBirth": { "value": "1950-01-01", "confidence": 0.92 },
    "insuranceNumber": { "value": "ABC123", "confidence": 0.88 }
  }
}
```

### 4. Classify Document
```
POST /api/documents/[id]/classify
```

**Response:**
```json
{
  "success": true,
  "type": "INSURANCE_CARD",
  "confidence": 0.94,
  "category": "Insurance"
}
```

### 5. Get Document
```
GET /api/documents/[id]
```

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "doc_123",
    "type": "INSURANCE_CARD",
    "fileName": "insurance_card.pdf",
    "fileUrl": "https://cloudinary.com/...",
    "extractedText": "...",
    "extractedData": {...},
    "complianceStatus": "COMPLIANT",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 6. List Documents
```
GET /api/documents?residentId=...&type=...&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "documents": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### 7. Search Documents
```
GET /api/documents/search?q=insurance&type=INSURANCE_CARD
```

**Response:**
```json
{
  "success": true,
  "results": [...],
  "count": 12
}
```

### 8. Update Document
```
PATCH /api/documents/[id]
```

**Request:**
```json
{
  "type": "INSURANCE_CARD",
  "tags": ["primary", "active"],
  "notes": "Updated insurance card",
  "extractedData": {...}
}
```

### 9. Delete Document
```
DELETE /api/documents/[id]
```

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### 10. Compliance Check
```
GET /api/documents/compliance/[residentId]
```

**Response:**
```json
{
  "success": true,
  "compliance": {
    "status": "COMPLIANT",
    "required": 8,
    "completed": 8,
    "missing": [],
    "expiring": [
      {
        "type": "INSURANCE_CARD",
        "expirationDate": "2024-12-31",
        "daysUntilExpiration": 45
      }
    ]
  }
}
```

### 11. Generate Document
```
POST /api/documents/generate
```

**Request:**
```json
{
  "templateId": "template_123",
  "residentId": "resident_456",
  "data": {
    "customField1": "value1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "doc_789",
    "fileUrl": "https://cloudinary.com/generated_contract.pdf",
    "fileName": "admission_contract.pdf"
  }
}
```

### 12. List Templates
```
GET /api/documents/templates
```

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "template_123",
      "name": "Admission Contract",
      "type": "CONTRACT",
      "description": "Standard admission contract template"
    }
  ]
}
```

### 13. Create Template (Admin)
```
POST /api/documents/templates
```

**Request:**
```json
{
  "name": "Admission Contract",
  "type": "CONTRACT",
  "description": "Standard admission contract template",
  "template": {...},
  "fields": {...}
}
```

### 14. Update Template (Admin)
```
PATCH /api/documents/templates/[id]
```

### 15. Delete Template (Admin)
```
DELETE /api/documents/templates/[id]
```

## Error Responses

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Error Codes:**
- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - No permission
- `NOT_FOUND` - Document not found
- `INVALID_FILE` - Invalid file type or size
- `EXTRACTION_FAILED` - OCR/AI extraction failed
- `UPLOAD_FAILED` - File upload failed
- `GENERATION_FAILED` - Document generation failed

## Authentication & Permissions

All endpoints require authentication. Permission requirements:

- **Upload/View/Edit**: `DOCUMENTS_VIEW`, `DOCUMENTS_CREATE`
- **Delete**: `DOCUMENTS_DELETE`
- **Templates**: `DOCUMENTS_MANAGE_TEMPLATES` (Admin only)
- **Compliance**: `COMPLIANCE_VIEW`
