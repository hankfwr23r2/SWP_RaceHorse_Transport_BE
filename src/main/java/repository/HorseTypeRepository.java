package repository;

import entity.HorseType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HorseTypeRepository extends JpaRepository<HorseType, Integer> {
}
