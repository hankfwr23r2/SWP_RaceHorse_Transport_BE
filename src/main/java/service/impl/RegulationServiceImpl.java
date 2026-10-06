package service.impl;

import entity.Regulation;

import repository.RegulationRepository;
import service.RegulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RegulationServiceImpl implements RegulationService {

    private final RegulationRepository regulationRepository;

    @Autowired
    public RegulationServiceImpl(RegulationRepository regulationRepository) {
        this.regulationRepository = regulationRepository;
    }

    @Override
    public List<Regulation> findAll() {
        return regulationRepository.findAll();
    }

    @Override
    public Optional<Regulation> findById(Integer id) {
        return regulationRepository.findById(id);
    }

    @Override
    public Regulation save(Regulation entity) {
        return regulationRepository.save(entity);
    }

    @Override
    public void deleteById(Integer id) {
        regulationRepository.deleteById(id);
    }
}
