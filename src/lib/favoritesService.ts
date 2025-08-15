/**
 * Favorites Service for CareLinkAI
 * 
 * This service provides client-side functions to interact with the favorites API,
 * allowing users to manage their favorite assisted living homes.
 */

/**
 * Interface for a favorite home's basic data
 */
export interface FavoriteHomeBasic {
  id: string;
  homeId: string;
  notes?: string | null;
  createdAt: string | Date;
}

/**
 * Interface for home address information
 */
export interface HomeAddress {
  city: string;
  state: string;
  zipCode: string;
}

/**
 * Interface for price range information
 */
export interface PriceRange {
  min: number | null;
  max: number | null;
  formattedMin?: string | null;
  formattedMax?: string | null;
}

/**
 * Interface for operator information
 */
export interface OperatorInfo {
  name: string;
  email: string;
}

/**
 * Interface for home details
 */
export interface HomeDetails {
  id: string;
  name: string;
  description: string;
  address: HomeAddress | null;
  careLevel: string[];
  priceRange: PriceRange;
  capacity: number;
  availability: number;
  amenities: string[];
  imageUrl: string | null;
  operator: OperatorInfo | null;
}

/**
 * Interface for a complete favorite home with details
 */
export interface FavoriteHome extends FavoriteHomeBasic {
  home: HomeDetails;
}

/**
 * Interface for API responses
 */
interface ApiResponse<T> {
  success: boolean;
  error?: string;
  details?: string;
  [key: string]: any;
}

/**
 * Favorites API response
 */
interface FavoritesResponse extends ApiResponse<FavoriteHome[]> {
  favorites: FavoriteHome[];
}

/**
 * Add favorite API response
 */
interface AddFavoriteResponse extends ApiResponse<FavoriteHomeBasic> {
  favorite: FavoriteHomeBasic;
  message?: string;
}

/**
 * Remove favorite API response
 */
interface RemoveFavoriteResponse extends ApiResponse<void> {
  message?: string;
}

/**
 * Error with additional API context
 */
export class FavoritesError extends Error {
  status?: number;
  details?: string;

  constructor(message: string, status?: number, details?: string) {
    super(message);
    this.name = 'FavoritesError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Get all favorites for the current user
 * 
 * @returns Promise with array of favorite homes
 * @throws FavoritesError if the request fails
 */
export async function getFavorites(): Promise<FavoriteHome[]> {
  try {
    const response = await fetch('/api/favorites', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData: ApiResponse<any> = await response.json();
      throw new FavoritesError(
        errorData.error || 'Failed to fetch favorites',
        response.status,
        errorData.details
      );
    }

    const data: FavoritesResponse = await response.json();
    return data.favorites;
  } catch (error) {
    if (error instanceof FavoritesError) {
      throw error;
    }
    throw new FavoritesError(
      error instanceof Error ? error.message : 'An unknown error occurred while fetching favorites'
    );
  }
}

/**
 * Add a home to favorites
 * 
 * @param homeId ID of the home to favorite
 * @param notes Optional notes about why the home was favorited
 * @returns Promise with the created favorite
 * @throws FavoritesError if the request fails
 */
export async function addFavorite(homeId: string, notes?: string): Promise<FavoriteHomeBasic> {
  try {
    const response = await fetch('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ homeId, notes }),
    });

    if (!response.ok) {
      const errorData: ApiResponse<any> = await response.json();
      
      // Special case: if home is already favorited, return the existing favorite
      if (response.status === 409 && errorData['favoriteId']) {
        return {
          id: errorData['favoriteId'],
          homeId,
          notes: notes || null,
          createdAt: new Date(),
        };
      }
      
      throw new FavoritesError(
        errorData.error || 'Failed to add favorite',
        response.status,
        errorData.details
      );
    }

    const data: AddFavoriteResponse = await response.json();
    return data.favorite;
  } catch (error) {
    if (error instanceof FavoritesError) {
      throw error;
    }
    throw new FavoritesError(
      error instanceof Error ? error.message : 'An unknown error occurred while adding favorite'
    );
  }
}

/**
 * Remove a home from favorites
 * 
 * @param homeId ID of the home to remove from favorites
 * @returns Promise that resolves when the favorite is removed
 * @throws FavoritesError if the request fails
 */
export async function removeFavorite(homeId: string): Promise<void> {
  try {
    const response = await fetch(`/api/favorites?homeId=${encodeURIComponent(homeId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData: ApiResponse<any> = await response.json();
      throw new FavoritesError(
        errorData.error || 'Failed to remove favorite',
        response.status,
        errorData.details
      );
    }

    await response.json();
    return;
  } catch (error) {
    if (error instanceof FavoritesError) {
      throw error;
    }
    throw new FavoritesError(
      error instanceof Error ? error.message : 'An unknown error occurred while removing favorite'
    );
  }
}

/**
 * Check if a home is favorited
 * 
 * @param homeId ID of the home to check
 * @param favorites Optional array of favorites (to avoid additional API call)
 * @returns Promise that resolves to true if the home is favorited, false otherwise
 * @throws FavoritesError if the request fails
 */
export async function isHomeFavorited(homeId: string, favorites?: FavoriteHome[]): Promise<boolean> {
  try {
    // If favorites are provided, use them to check
    if (favorites) {
      return favorites.some(favorite => favorite.homeId === homeId);
    }
    
    // Otherwise, fetch favorites and check
    const userFavorites = await getFavorites();
    return userFavorites.some(favorite => favorite.homeId === homeId);
  } catch (error) {
    if (error instanceof FavoritesError) {
      throw error;
    }
    throw new FavoritesError(
      error instanceof Error ? error.message : 'An unknown error occurred while checking favorite status'
    );
  }
}

/**
 * Toggle favorite status for a home
 * 
 * @param homeId ID of the home to toggle favorite status
 * @param currentStatus Current favorite status (to avoid additional API call)
 * @param notes Optional notes to add if favoriting
 * @returns Promise that resolves to the new favorite status (true if favorited, false if unfavorited)
 * @throws FavoritesError if the request fails
 */
export async function toggleFavorite(
  homeId: string, 
  currentStatus?: boolean,
  notes?: string
): Promise<boolean> {
  try {
    // Determine current status if not provided
    const isFavorited = currentStatus !== undefined 
      ? currentStatus 
      : await isHomeFavorited(homeId);
    
    if (isFavorited) {
      // If currently favorited, remove from favorites
      await removeFavorite(homeId);
      return false;
    } else {
      // If not favorited, add to favorites
      await addFavorite(homeId, notes);
      return true;
    }
  } catch (error) {
    if (error instanceof FavoritesError) {
      throw error;
    }
    throw new FavoritesError(
      error instanceof Error ? error.message : 'An unknown error occurred while toggling favorite status'
    );
  }
}
