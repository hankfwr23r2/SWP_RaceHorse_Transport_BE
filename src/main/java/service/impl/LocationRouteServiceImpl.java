package service.impl;

import entity.LocationRoute;
import entity.LocationRouteId;
import repository.LocationRouteRepository;
import service.LocationRouteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class LocationRouteServiceImpl implements LocationRouteService {

    private final LocationRouteRepository locationRouteRepository;

    @Autowired
    public LocationRouteServiceImpl(LocationRouteRepository locationRouteRepository) {
        this.locationRouteRepository = locationRouteRepository;
    }

    @Override
    public List<LocationRoute> findAll() {
        return locationRouteRepository.findAll();
    }

    @Override
    public Optional<LocationRoute> findById(LocationRouteId id) {
        return locationRouteRepository.findById(id);
    }

    @Override
    public LocationRoute save(LocationRoute entity) {
        return locationRouteRepository.save(entity);
    }

    @Override
    public void deleteById(LocationRouteId id) {
        locationRouteRepository.deleteById(id);
    }
}
