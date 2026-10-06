package service;

import entity.HorseType;

import java.util.List;
import java.util.Optional;

public interface HorseTypeService {
    List<HorseType> findAll();
    Optional<HorseType> findById(Integer id);
    HorseType save(HorseType entity);
    void deleteById(Integer id);
}
