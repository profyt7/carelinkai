import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Updates the capacity and availability status for a home based on current resident count
 * @param homeId - The ID of the assisted living home
 * @returns The updated home record
 */
export async function updateHomeCapacity(homeId: string) {
  try {
    // Fetch the home with active residents
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      include: {
        residents: {
          where: {
            status: 'ACTIVE',
            archivedAt: null,
          },
        },
      },
    });

    if (!home) {
      throw new Error(`Home with ID ${homeId} not found`);
    }

    // Calculate current occupancy
    const currentOccupancy = home.residents?.length ?? 0;
    const availableBeds = Math.max(0, home.capacity - currentOccupancy);

    // Determine status based on occupancy
    let status = home.status;
    if (home.status === 'ACTIVE') {
      if (currentOccupancy >= home.capacity) {
        status = 'ACTIVE'; // Keep as ACTIVE even when full (don't change to FULL status)
      } else if (currentOccupancy === 0) {
        // Keep existing status if no residents
        status = home.status;
      }
    }

    // Update the home record
    const updatedHome = await prisma.assistedLivingHome.update({
      where: { id: homeId },
      data: {
        currentOccupancy,
      },
    });

    return {
      success: true,
      home: updatedHome,
      metrics: {
        currentOccupancy,
        availableBeds,
        occupancyRate: home.capacity > 0 ? (currentOccupancy / home.capacity) * 100 : 0,
      },
    };
  } catch (error) {
    console.error('Error updating home capacity:', error);
    throw error;
  }
}

/**
 * Updates capacity for multiple homes in a batch operation
 * @param homeIds - Array of home IDs to update
 * @returns Array of update results
 */
export async function batchUpdateHomeCapacity(homeIds: string[]) {
  const results = [];
  
  for (const homeId of homeIds) {
    try {
      const result = await updateHomeCapacity(homeId);
      results.push(result);
    } catch (error) {
      console.error(`Failed to update capacity for home ${homeId}:`, error);
      results.push({
        success: false,
        homeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

/**
 * Gets capacity metrics for a home without updating the database
 * @param homeId - The ID of the assisted living home
 * @returns Capacity metrics
 */
export async function getHomeCapacityMetrics(homeId: string) {
  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: homeId },
    include: {
      residents: {
        where: {
          status: 'ACTIVE',
          archivedAt: null,
        },
      },
    },
  });

  if (!home) {
    throw new Error(`Home with ID ${homeId} not found`);
  }

  const currentOccupancy = home.residents?.length ?? 0;
  const availableBeds = Math.max(0, home.capacity - currentOccupancy);
  const occupancyRate = home.capacity > 0 ? (currentOccupancy / home.capacity) * 100 : 0;

  return {
    homeId,
    capacity: home.capacity,
    currentOccupancy,
    availableBeds,
    occupancyRate,
    status: home.status,
  };
}
