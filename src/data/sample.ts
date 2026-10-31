/**
 * Sample JSON data for demonstration.
 */
export const SAMPLE_JSON = {
  "productCategories": [
    {
      "categoryId": "CAT-001",
      "categoryName": "Electronics",
      "isActive": true,
      "subCategories": [
        {
          "subCategoryId": "SUB-001",
          "subCategoryName": "Smartphones",
          "itemCount": 245,
          "avgPrice": 799.99,
          "topBrands": ["Apple", "Samsung", "Google"]
        },
        {
          "subCategoryId": "SUB-002",
          "subCategoryName": "Laptops",
          "itemCount": 189,
          "avgPrice": 1249.99,
          "topBrands": ["Apple", "Dell", "Lenovo"]
        },
        {
          "subCategoryId": "SUB-003",
          "subCategoryName": "Audio",
          "itemCount": 567,
          "avgPrice": 149.50,
          "topBrands": ["Sony", "Bose", "JBL"]
        }
      ]
    },
    {
      "categoryId": "CAT-002",
      "categoryName": "Home & Garden",
      "isActive": true,
      "subCategories": [
        {
          "subCategoryId": "SUB-004",
          "subCategoryName": "Furniture",
          "itemCount": 892,
          "avgPrice": 450.00,
          "topBrands": ["IKEA", "West Elm", "Crate & Barrel"]
        },
        {
          "subCategoryId": "SUB-005",
          "subCategoryName": "Lighting",
          "itemCount": 334,
          "avgPrice": 89.99,
          "topBrands": ["Philips", "GE", "Feit"]
        }
      ]
    },
    {
      "categoryId": "CAT-003",
      "categoryName": "Sports",
      "isActive": false,
      "subCategories": [
        {
          "subCategoryId": "SUB-006",
          "subCategoryName": "Running",
          "itemCount": 456,
          "avgPrice": 129.99,
          "topBrands": ["Nike", "Adidas", "New Balance"]
        }
      ]
    }
  ],
  "metadata": {
    "lastUpdated": "2026-10-31T12:00:00Z",
    "version": "2.1.0",
    "totalProducts": 2683,
    "currency": "USD"
  }
};

export function getSampleJSON(): string {
  return JSON.stringify(SAMPLE_JSON, null, 2);
}
