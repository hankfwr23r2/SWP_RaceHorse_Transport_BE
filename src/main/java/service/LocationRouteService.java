package service;

import entity.LocationRoute;
import entity.LocationRouteId;
import java.util.List;
import java.util.Optional;

public interface LocationRouteService {
    List<LocationRoute> findAll();
    Optional<LocationRoute> findById(LocationRouteId id);
    LocationRoute save(LocationRoute entity);
    void deleteById(LocationRouteId id);
}
