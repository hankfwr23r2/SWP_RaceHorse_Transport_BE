package service;

import entity.Incident;

import java.util.List;
import java.util.Optional;

public interface IncidentService {
    List<Incident> findAll();
    Optional<Incident> findById(Integer id);
    Incident save(Incident entity);
    void deleteById(Integer id);
}
