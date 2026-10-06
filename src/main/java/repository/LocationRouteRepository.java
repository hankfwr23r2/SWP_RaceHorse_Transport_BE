package repository;

import entity.LocationRoute;
import entity.LocationRouteId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LocationRouteRepository extends JpaRepository<LocationRoute, LocationRouteId> {
}
